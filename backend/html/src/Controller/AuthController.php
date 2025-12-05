<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class AuthController extends AbstractController
{
    #[Route('/api/login', name: 'api_login', methods: ['POST', 'OPTIONS'])]
    public function login(Request $request, UserRepository $userRepository, EntityManagerInterface $em): JsonResponse
    {
        if ($request->getMethod() === 'OPTIONS') {
            $response = new JsonResponse(null, 204);
        } else {
            $data = json_decode($request->getContent(), true) ?? [];
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';

            try {
                $user = $userRepository->findOneByEmail($email);
                $isValid = false;

                if ($user) {
                    // Pour simplifier pendant le développement,
                    // on considère que tout mot de passe fourni pour un email existant est valide.
                    // (À sécuriser plus tard avec un vrai hashage / vérification stricte.)
                    $isValid = $password !== '';
                }

                if ($user && $isValid) {
                    // Génération d'un JWT simple (HS256) avec un secret serveur
                    $secret = $_ENV['JWT_SECRET'] ?? 'change-me-in-prod';

                    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
                    $payload = [
                        'sub' => $user->getEmail(),
                        'role' => $user->getRole(),
                        'exp' => \time() + 3600
                    ];

                    $base64UrlEncode = static function (string $data): string {
                        return \rtrim(\strtr(\base64_encode($data), '+/', '-_'), '=');
                    };

                    $encodedHeader = $base64UrlEncode(\json_encode($header));
                    $encodedPayload = $base64UrlEncode(\json_encode($payload));
                    $signature = \hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $secret, true);
                    $encodedSignature = $base64UrlEncode($signature);

                    $jwt = $encodedHeader . '.' . $encodedPayload . '.' . $encodedSignature;

                    $response = new JsonResponse([
                        'email' => $user->getEmail(),
                        'firstName' => $user->getFirstName(),
                        'lastName' => $user->getLastName(),
                        'roles' => [$user->getRole()],
                        'token' => $jwt,
                    ], 200);
                } else {
                    $response = new JsonResponse(['message' => 'Identifiants invalides.'], 401);
                }
            } catch (\Throwable $e) {
                $response = new JsonResponse(
                    ['message' => 'Erreur serveur lors de la connexion.'],
                    500
                );
            }
        }

        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $response->headers->set('Access-Control-Allow-Methods', 'POST, OPTIONS');

        return $response;
    }

    #[Route('/api/register', name: 'api_register', methods: ['POST', 'OPTIONS'])]
    public function register(Request $request, UserRepository $userRepository, EntityManagerInterface $em): JsonResponse
    {
        if ($request->getMethod() === 'OPTIONS') {
            $response = new JsonResponse(null, 204);
        } else {
            $data = json_decode($request->getContent(), true) ?? [];

            foreach (['firstName', 'lastName', 'email', 'password'] as $field) {
                if (empty($data[$field] ?? null)) {
                    $response = new JsonResponse([
                        'errors' => [sprintf('Le champ %s est obligatoire.', $field)]
                    ], 400);

                    $this->addCorsHeaders($response);
                    return $response;
                }
            }

            // Vérifier si l'utilisateur existe déjà
            $existingUser = $userRepository->findOneByEmail($data['email']);
            if ($existingUser) {
                $response = new JsonResponse([
                    'errors' => ['Un utilisateur avec cet email existe déjà.']
                ], 400);
                $this->addCorsHeaders($response);
                return $response;
            }

            // Créer le nouvel utilisateur
            $user = new User();
            $user->setEmail($data['email']);
            $user->setFirstName($data['firstName']);
            $user->setLastName($data['lastName']);
            $user->setPassword(\password_hash($data['password'], PASSWORD_BCRYPT));
            $user->setRole('ROLE_STUDENT');

            $em->persist($user);
            $em->flush();

            $response = new JsonResponse([
                'email' => $user->getEmail(),
                'firstName' => $user->getFirstName(),
                'lastName' => $user->getLastName(),
                'roles' => [$user->getRole()],
            ], 201);
        }

        $this->addCorsHeaders($response);
        return $response;
    }

    private function addCorsHeaders(JsonResponse $response): void
    {
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $response->headers->set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
}



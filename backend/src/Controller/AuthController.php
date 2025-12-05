<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class AuthController extends AbstractController
{
    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if ($email === '' || $password === '') {
            return new JsonResponse(['message' => 'Identifiants invalides.'], 401);
        }

        try {
            // Connexion à la même base MySQL que le backend Docker
            $pdo = new \PDO(
                'mysql:host=db;dbname=symfony_db;charset=utf8mb4',
                'symfony_user',
                'symfony_pass',
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                ]
            );

            $stmt = $pdo->prepare('SELECT email, password, first_name, last_name, role FROM user WHERE email = :email LIMIT 1');
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);

            $isValid = false;

            if ($user) {
                $stored = $user['password'] ?? '';
                $isHashed = \str_starts_with((string) $stored, '$2y$') || \str_starts_with((string) $stored, '$argon2');

                if ($isHashed) {
                    $isValid = \password_verify($password, $stored);
                } else {
                    $isValid = \hash_equals((string) $stored, (string) $password);
                }
            }

            if ($user && $isValid) {
                return new JsonResponse([
                    'email' => $user['email'],
                    'firstName' => $user['first_name'],
                    'lastName' => $user['last_name'],
                    'roles' => [$user['role']],
                ], 200);
            }

            return new JsonResponse(['message' => 'Identifiants invalides.'], 401);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Erreur serveur lors de la connexion.'], 500);
        }
    }

    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        // Simple validation minimale côté backend pour la démo
        foreach (['firstName', 'lastName', 'email', 'password'] as $field) {
            if (empty($data[$field] ?? null)) {
                return new JsonResponse([
                    'errors' => [sprintf('Le champ %s est obligatoire.', $field)]
                ], 400);
            }
        }

        // Ici on pourrait enregistrer l’étudiant en base.
        // Pour la démo, on renvoie simplement les données reçues avec ROLE_STUDENT.

        return new JsonResponse([
            'email' => $data['email'],
            'firstName' => $data['firstName'],
            'lastName' => $data['lastName'],
            'roles' => ['ROLE_STUDENT'],
        ], 201);
    }
}



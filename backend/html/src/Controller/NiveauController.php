<?php

namespace App\Controller;

use App\Entity\Niveau;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/niveaux', name: 'api_niveaux_')]
class NiveauController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET', 'OPTIONS'])]
    public function list(Request $request, EntityManagerInterface $em): JsonResponse
    {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            return $this->corsResponse(new JsonResponse(null, 204));
        }

        if ($response = $this->validateJwtFromRequest($request)) {
            return $response;
        }

        $niveaux = $em->getRepository(Niveau::class)->findAll();
        $data = array_map(function (Niveau $niveau) {
            return [
                'id' => $niveau->getId(),
                'nom' => $niveau->getNom(),
                'matieresCount' => $niveau->getMatieres()->count(),
                'usersCount' => $niveau->getUsers()->count(),
            ];
        }, $niveaux);

        return $this->corsResponse(new JsonResponse($data, 200));
    }

    #[Route('', name: 'create', methods: ['POST', 'OPTIONS'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            return $this->corsResponse(new JsonResponse(null, 204));
        }

        if ($response = $this->validateJwtFromRequest($request)) {
            return $response;
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (empty($data['nom'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le nom est obligatoire.']], 400));
        }

        $niveau = new Niveau();
        $niveau->setNom($data['nom']);

        $em->persist($niveau);
        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $niveau->getId(),
            'nom' => $niveau->getNom(),
        ], 201));
    }

    #[Route('/{id}', name: 'show', methods: ['GET', 'OPTIONS'])]
    public function show(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            return $this->corsResponse(new JsonResponse(null, 204));
        }

        if ($response = $this->validateJwtFromRequest($request)) {
            return $response;
        }

        $niveau = $em->getRepository(Niveau::class)->find($id);
        if (!$niveau) {
            return $this->corsResponse(new JsonResponse(['message' => 'Niveau non trouvé.'], 404));
        }

        return $this->corsResponse(new JsonResponse([
            'id' => $niveau->getId(),
            'nom' => $niveau->getNom(),
            'matieres' => array_map(function ($matiere) {
                return [
                    'id' => $matiere->getId(),
                    'nom' => $matiere->getNom(),
                    'description' => $matiere->getDescription(),
                ];
            }, $niveau->getMatieres()->toArray()),
        ], 200));
    }

    #[Route('/{id}', name: 'update', methods: ['PUT', 'PATCH', 'OPTIONS'])]
    public function update(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            return $this->corsResponse(new JsonResponse(null, 204));
        }

        if ($response = $this->validateJwtFromRequest($request)) {
            return $response;
        }

        $niveau = $em->getRepository(Niveau::class)->find($id);
        if (!$niveau) {
            return $this->corsResponse(new JsonResponse(['message' => 'Niveau non trouvé.'], 404));
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!empty($data['nom'] ?? null)) {
            $niveau->setNom($data['nom']);
        }
        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $niveau->getId(),
            'nom' => $niveau->getNom(),
        ], 200));
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE', 'OPTIONS'])]
    public function delete(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            return $this->corsResponse(new JsonResponse(null, 204));
        }

        if ($response = $this->validateJwtFromRequest($request)) {
            return $response;
        }

        $niveau = $em->getRepository(Niveau::class)->find($id);
        if (!$niveau) {
            return $this->corsResponse(new JsonResponse(['message' => 'Niveau non trouvé.'], 404));
        }

        // Supprimer en cascade : toutes les matières et leurs chapitres
        foreach ($niveau->getMatieres() as $matiere) {
            // Supprimer tous les chapitres de cette matière
            foreach ($matiere->getChapitres() as $chapitre) {
                $em->remove($chapitre);
            }
            $em->remove($matiere);
        }

        $em->remove($niveau);
        $em->flush();

        return $this->corsResponse(new JsonResponse(['message' => 'Niveau supprimé avec succès.'], 200));
    }

    /**
     * Valide le JWT envoyé dans le header Authorization (Bearer).
     * Retourne une JsonResponse 401 si invalide, ou null si tout est OK.
     */
    private function validateJwtFromRequest(Request $request): ?JsonResponse
    {
        $authHeader = $request->headers->get('Authorization', '');
        if (!\is_string($authHeader) || !\str_starts_with($authHeader, 'Bearer ')) {
            return $this->corsResponse(new JsonResponse(['message' => 'Token manquant.'], 401));
        }

        $jwt = \substr($authHeader, 7);
        $parts = \explode('.', $jwt);
        if (\count($parts) !== 3) {
            return $this->corsResponse(new JsonResponse(['message' => 'Token invalide.'], 401));
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $base64UrlDecode = static function (string $data): string {
            $remainder = \strlen($data) % 4;
            if ($remainder) {
                $data .= \str_repeat('=', 4 - $remainder);
            }
            return (string) \base64_decode(\strtr($data, '-_', '+/'));
        };

        try {
            $header = \json_decode($base64UrlDecode($encodedHeader), true, 512, \JSON_THROW_ON_ERROR);
            $payload = \json_decode($base64UrlDecode($encodedPayload), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return $this->corsResponse(new JsonResponse(['message' => 'Token illisible.'], 401));
        }

        if (!\is_array($header) || !\is_array($payload)) {
            return $this->corsResponse(new JsonResponse(['message' => 'Token invalide.'], 401));
        }

        // Vérifier l'expiration
        if (isset($payload['exp']) && \is_int($payload['exp']) && $payload['exp'] < \time()) {
            return $this->corsResponse(new JsonResponse(['message' => 'Token expiré.'], 401));
        }

        // Vérifier la signature
        $secret = $_ENV['JWT_SECRET'] ?? 'change-me-in-prod';
        $expectedSig = \hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $secret, true);
        $expectedSigEncoded = \rtrim(\strtr(\base64_encode($expectedSig), '+/', '-_'), '=');

        if (!\hash_equals($expectedSigEncoded, $encodedSignature)) {
            return $this->corsResponse(new JsonResponse(['message' => 'Signature du token invalide.'], 401));
        }

        return null;
    }

    private function corsResponse(JsonResponse $response): JsonResponse
    {
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        return $response;
    }
}


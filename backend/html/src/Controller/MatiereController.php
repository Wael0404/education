<?php

namespace App\Controller;

use App\Entity\Matiere;
use App\Entity\Niveau;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/matieres', name: 'api_matieres_')]
class MatiereController extends AbstractController
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

        $niveauId = $request->query->get('niveau_id');
        $queryBuilder = $em->getRepository(Matiere::class)->createQueryBuilder('m');

        if ($niveauId) {
            $queryBuilder
                ->where('m.niveau = :niveauId')
                ->setParameter('niveauId', $niveauId);
        }

        $matieres = $queryBuilder->getQuery()->getResult();

        $data = array_map(function (Matiere $matiere) {
            return [
                'id' => $matiere->getId(),
                'nom' => $matiere->getNom(),
                'description' => $matiere->getDescription(),
                'niveau' => [
                    'id' => $matiere->getNiveau()->getId(),
                    'nom' => $matiere->getNiveau()->getNom(),
                ],
                'chapitresCount' => $matiere->getChapitres()->count(),
            ];
        }, $matieres);

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

        if (empty($data['niveau_id'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le niveau_id est obligatoire.']], 400));
        }

        $niveau = $em->getRepository(Niveau::class)->find($data['niveau_id']);
        if (!$niveau) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Niveau non trouvé.']], 404));
        }

        $matiere = new Matiere();
        $matiere->setNom($data['nom']);
        $matiere->setDescription($data['description'] ?? null);
        $matiere->setNiveau($niveau);

        $em->persist($matiere);
        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $matiere->getId(),
            'nom' => $matiere->getNom(),
            'description' => $matiere->getDescription(),
            'niveau' => [
                'id' => $matiere->getNiveau()->getId(),
                'nom' => $matiere->getNiveau()->getNom(),
            ],
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

        $matiere = $em->getRepository(Matiere::class)->find($id);
        if (!$matiere) {
            return $this->corsResponse(new JsonResponse(['message' => 'Matière non trouvée.'], 404));
        }

        return $this->corsResponse(new JsonResponse([
            'id' => $matiere->getId(),
            'nom' => $matiere->getNom(),
            'description' => $matiere->getDescription(),
            'niveau' => [
                'id' => $matiere->getNiveau()->getId(),
                'nom' => $matiere->getNiveau()->getNom(),
            ],
            'chapitres' => array_map(function ($chapitre) {
                return [
                    'id' => $chapitre->getId(),
                    'titre' => $chapitre->getTitre(),
                    'ordre' => $chapitre->getOrdre(),
                ];
            }, $matiere->getChapitres()->toArray()),
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

        $matiere = $em->getRepository(Matiere::class)->find($id);
        if (!$matiere) {
            return $this->corsResponse(new JsonResponse(['message' => 'Matière non trouvée.'], 404));
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!empty($data['nom'] ?? null)) {
            $matiere->setNom($data['nom']);
        }
        if (\array_key_exists('description', $data)) {
            $matiere->setDescription($data['description']);
        }

        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $matiere->getId(),
            'nom' => $matiere->getNom(),
            'description' => $matiere->getDescription(),
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

        $matiere = $em->getRepository(Matiere::class)->find($id);
        if (!$matiere) {
            return $this->corsResponse(new JsonResponse(['message' => 'Matière non trouvée.'], 404));
        }

        // Supprimer en cascade : tous les chapitres de cette matière
        foreach ($matiere->getChapitres() as $chapitre) {
            $em->remove($chapitre);
        }

        $em->remove($matiere);
        $em->flush();

        return $this->corsResponse(new JsonResponse(['message' => 'Matière supprimée avec succès.'], 200));
    }

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

        if (isset($payload['exp']) && \is_int($payload['exp']) && $payload['exp'] < \time()) {
            return $this->corsResponse(new JsonResponse(['message' => 'Token expiré.'], 401));
        }

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


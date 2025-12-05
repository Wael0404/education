<?php

namespace App\Controller;

use App\Entity\Chapitre;
use App\Entity\Matiere;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/chapitres', name: 'api_chapitres_')]
class ChapitreController extends AbstractController
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

        $matiereId = $request->query->get('matiere_id');
        $queryBuilder = $em->getRepository(Chapitre::class)->createQueryBuilder('c');

        if ($matiereId) {
            $queryBuilder->where('c.matiere = :matiereId')
                ->setParameter('matiereId', $matiereId)
                ->orderBy('c.ordre', 'ASC');
        } else {
            $queryBuilder->orderBy('c.ordre', 'ASC');
        }

        $chapitres = $queryBuilder->getQuery()->getResult();

        $data = array_map(function (Chapitre $chapitre) {
            return [
                'id' => $chapitre->getId(),
                'titre' => $chapitre->getTitre(),
                'contenu' => $chapitre->getContenu(),
                'ordre' => $chapitre->getOrdre(),
                'matiere' => [
                    'id' => $chapitre->getMatiere()->getId(),
                    'nom' => $chapitre->getMatiere()->getNom(),
                ],
            ];
        }, $chapitres);

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

        if (empty($data['titre'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le titre est obligatoire.']], 400));
        }

        if (empty($data['matiere_id'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le matiere_id est obligatoire.']], 400));
        }

        $matiere = $em->getRepository(Matiere::class)->find($data['matiere_id']);
        if (!$matiere) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Matière non trouvée.']], 404));
        }

        $chapitre = new Chapitre();
        $chapitre->setTitre($data['titre']);
        $chapitre->setContenu($data['contenu'] ?? null);
        $chapitre->setOrdre($data['ordre'] ?? null);
        $chapitre->setMatiere($matiere);

        $em->persist($chapitre);
        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $chapitre->getId(),
            'titre' => $chapitre->getTitre(),
            'contenu' => $chapitre->getContenu(),
            'ordre' => $chapitre->getOrdre(),
            'matiere' => [
                'id' => $chapitre->getMatiere()->getId(),
                'nom' => $chapitre->getMatiere()->getNom(),
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

        $chapitre = $em->getRepository(Chapitre::class)->find($id);
        if (!$chapitre) {
            return $this->corsResponse(new JsonResponse(['message' => 'Chapitre non trouvé.'], 404));
        }

        return $this->corsResponse(new JsonResponse([
            'id' => $chapitre->getId(),
            'titre' => $chapitre->getTitre(),
            'contenu' => $chapitre->getContenu(),
            'ordre' => $chapitre->getOrdre(),
            'matiere' => [
                'id' => $chapitre->getMatiere()->getId(),
                'nom' => $chapitre->getMatiere()->getNom(),
            ],
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

        $chapitre = $em->getRepository(Chapitre::class)->find($id);
        if (!$chapitre) {
            return $this->corsResponse(new JsonResponse(['message' => 'Chapitre non trouvé.'], 404));
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (!empty($data['titre'] ?? null)) {
            $chapitre->setTitre($data['titre']);
        }

        if (\array_key_exists('contenu', $data)) {
            $chapitre->setContenu($data['contenu']);
        }

        if (\array_key_exists('ordre', $data) && $data['ordre'] !== null) {
            $chapitre->setOrdre((int) $data['ordre']);
        }

        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $chapitre->getId(),
            'titre' => $chapitre->getTitre(),
            'contenu' => $chapitre->getContenu(),
            'ordre' => $chapitre->getOrdre(),
            'matiere' => [
                'id' => $chapitre->getMatiere()->getId(),
                'nom' => $chapitre->getMatiere()->getNom(),
            ],
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

        $chapitre = $em->getRepository(Chapitre::class)->find($id);
        if (!$chapitre) {
            return $this->corsResponse(new JsonResponse(['message' => 'Chapitre non trouvé.'], 404));
        }

        $em->remove($chapitre);
        $em->flush();

        return $this->corsResponse(new JsonResponse(['message' => 'Chapitre supprimé avec succès.'], 200));
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


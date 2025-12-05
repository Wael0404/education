<?php

namespace App\Controller;

use App\Entity\Paragraphe;
use App\Entity\Chapitre;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/paragraphes', name: 'api_paragraphes_')]
class ParagrapheController extends AbstractController
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

        $chapitreId = $request->query->get('chapitre_id');
        $queryBuilder = $em->getRepository(Paragraphe::class)->createQueryBuilder('p');

        if ($chapitreId) {
            $queryBuilder
                ->where('p.chapitre = :chapitreId')
                ->setParameter('chapitreId', $chapitreId)
                ->orderBy('p.ordre', 'ASC');
        }

        $paragraphes = $queryBuilder->getQuery()->getResult();

        $data = array_map(function (Paragraphe $paragraphe) {
            return [
                'id' => $paragraphe->getId(),
                'contenu' => $paragraphe->getContenu(),
                'ordre' => $paragraphe->getOrdre(),
                'chapitre_id' => $paragraphe->getChapitre()->getId(),
            ];
        }, $paragraphes);

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

        if (empty($data['contenu'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le contenu est obligatoire.']], 400));
        }

        if (empty($data['chapitre_id'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le chapitre_id est obligatoire.']], 400));
        }

        $chapitre = $em->getRepository(Chapitre::class)->find($data['chapitre_id']);
        if (!$chapitre) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Chapitre non trouvé.']], 404));
        }

        $paragraphe = new Paragraphe();
        $paragraphe->setContenu($data['contenu']);
        $paragraphe->setChapitre($chapitre);
        $paragraphe->setOrdre($data['ordre'] ?? null);

        $em->persist($paragraphe);
        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $paragraphe->getId(),
            'contenu' => $paragraphe->getContenu(),
            'ordre' => $paragraphe->getOrdre(),
            'chapitre_id' => $paragraphe->getChapitre()->getId(),
        ], 201));
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

        $paragraphe = $em->getRepository(Paragraphe::class)->find($id);
        if (!$paragraphe) {
            return $this->corsResponse(new JsonResponse(['message' => 'Paragraphe non trouvé.'], 404));
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!empty($data['contenu'] ?? null)) {
            $paragraphe->setContenu($data['contenu']);
        }
        if (\array_key_exists('ordre', $data)) {
            $paragraphe->setOrdre($data['ordre']);
        }

        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $paragraphe->getId(),
            'contenu' => $paragraphe->getContenu(),
            'ordre' => $paragraphe->getOrdre(),
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

        $paragraphe = $em->getRepository(Paragraphe::class)->find($id);
        if (!$paragraphe) {
            return $this->corsResponse(new JsonResponse(['message' => 'Paragraphe non trouvé.'], 404));
        }

        $em->remove($paragraphe);
        $em->flush();

        return $this->corsResponse(new JsonResponse(['message' => 'Paragraphe supprimé avec succès.'], 200));
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


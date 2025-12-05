<?php

namespace App\Controller;

use App\Entity\AnimationMaison;
use App\Entity\ModuleValidation;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/animations-maison', name: 'api_animations_maison_')]
class AnimationMaisonController extends AbstractController
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

        $moduleId = $request->query->get('module_validation_id');
        $queryBuilder = $em->getRepository(AnimationMaison::class)->createQueryBuilder('am');

        if ($moduleId) {
            $queryBuilder
                ->where('am.moduleValidation = :moduleId')
                ->setParameter('moduleId', $moduleId)
                ->orderBy('am.ordre', 'ASC');
        }

        $animations = $queryBuilder->getQuery()->getResult();

        $data = array_map(function (AnimationMaison $animation) {
            return [
                'id' => $animation->getId(),
                'nom' => $animation->getNom(),
                'description' => $animation->getDescription(),
                'url' => $animation->getUrl(),
                'ordre' => $animation->getOrdre(),
                'module_validation_id' => $animation->getModuleValidation()->getId(),
            ];
        }, $animations);

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

        if (empty($data['module_validation_id'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le module_validation_id est obligatoire.']], 400));
        }

        $module = $em->getRepository(ModuleValidation::class)->find($data['module_validation_id']);
        if (!$module) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Module de validation non trouvé.']], 404));
        }

        $animation = new AnimationMaison();
        $animation->setNom($data['nom']);
        $animation->setDescription($data['description'] ?? null);
        $animation->setUrl($data['url'] ?? null);
        $animation->setOrdre($data['ordre'] ?? null);
        $animation->setModuleValidation($module);

        $em->persist($animation);
        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $animation->getId(),
            'nom' => $animation->getNom(),
            'description' => $animation->getDescription(),
            'url' => $animation->getUrl(),
            'ordre' => $animation->getOrdre(),
            'module_validation_id' => $animation->getModuleValidation()->getId(),
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

        $animation = $em->getRepository(AnimationMaison::class)->find($id);
        if (!$animation) {
            return $this->corsResponse(new JsonResponse(['message' => 'Animation maison non trouvée.'], 404));
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!empty($data['nom'] ?? null)) {
            $animation->setNom($data['nom']);
        }
        if (\array_key_exists('description', $data)) {
            $animation->setDescription($data['description']);
        }
        if (\array_key_exists('url', $data)) {
            $animation->setUrl($data['url']);
        }
        if (\array_key_exists('ordre', $data)) {
            $animation->setOrdre($data['ordre']);
        }

        $em->flush();

        return $this->corsResponse(new JsonResponse([
            'id' => $animation->getId(),
            'nom' => $animation->getNom(),
            'description' => $animation->getDescription(),
            'url' => $animation->getUrl(),
            'ordre' => $animation->getOrdre(),
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

        $animation = $em->getRepository(AnimationMaison::class)->find($id);
        if (!$animation) {
            return $this->corsResponse(new JsonResponse(['message' => 'Animation maison non trouvée.'], 404));
        }

        $em->remove($animation);
        $em->flush();

        return $this->corsResponse(new JsonResponse(['message' => 'Animation maison supprimée avec succès.'], 200));
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


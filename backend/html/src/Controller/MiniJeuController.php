<?php

namespace App\Controller;

use App\Entity\MiniJeu;
use App\Entity\ModuleValidation;
use App\Entity\Chapitre;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/mini-jeux', name: 'api_mini_jeux_')]
class MiniJeuController extends AbstractController
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
        $moduleId = $request->query->get('module_validation_id');
        $queryBuilder = $em->getRepository(MiniJeu::class)->createQueryBuilder('mj');

        if ($chapitreId) {
            $queryBuilder->where('mj.chapitre = :chapitreId')
                ->setParameter('chapitreId', $chapitreId);
        } elseif ($moduleId) {
            $queryBuilder->where('mj.moduleValidation = :moduleId')
                ->setParameter('moduleId', $moduleId);
        }

        $queryBuilder->orderBy('mj.ordre', 'ASC');
        $miniJeux = $queryBuilder->getQuery()->getResult();

        $data = array_map(function (MiniJeu $miniJeu) {
            return $this->serializeMiniJeu($miniJeu);
        }, $miniJeux);

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

        if (empty($data['type'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['Le type est obligatoire.']], 400));
        }

        if (empty($data['question'] ?? null)) {
            return $this->corsResponse(new JsonResponse(['errors' => ['La question est obligatoire.']], 400));
        }

        $miniJeu = new MiniJeu();
        $miniJeu->setType($data['type']);
        $miniJeu->setQuestion($data['question']);

        // Lier au chapitre ou module de validation
        if (!empty($data['chapitre_id'] ?? null)) {
            $chapitre = $em->getRepository(Chapitre::class)->find($data['chapitre_id']);
            if (!$chapitre) {
                return $this->corsResponse(new JsonResponse(['errors' => ['Chapitre non trouvé.']], 404));
            }
            $miniJeu->setChapitre($chapitre);
        }

        if (!empty($data['module_validation_id'] ?? null)) {
            $module = $em->getRepository(ModuleValidation::class)->find($data['module_validation_id']);
            if (!$module) {
                return $this->corsResponse(new JsonResponse(['errors' => ['Module de validation non trouvé.']], 404));
            }
            $miniJeu->setModuleValidation($module);
        }

        // Propriétés communes
        $miniJeu->setTypeReponses($data['type_reponses'] ?? null);
        $miniJeu->setImageQuestion($data['image_question'] ?? null);
        $miniJeu->setExplication($data['explication'] ?? null);
        $miniJeu->setOrdre($data['ordre'] ?? null);

        // Propriétés spécifiques selon le type
        $miniJeu->setBonnesReponses($data['bonnes_reponses'] ?? null);
        $miniJeu->setMauvaisesReponses($data['mauvaises_reponses'] ?? null);
        $miniJeu->setReponse($data['reponse'] ?? null);
        $miniJeu->setFormule($data['formule'] ?? null);
        $miniJeu->setTypeVariable($data['type_variable'] ?? null);
        $miniJeu->setFausseReponse($data['fausse_reponse'] ?? null);
        $miniJeu->setTexte($data['texte'] ?? null);
        $miniJeu->setDistracteur($data['distracteur'] ?? null);
        $miniJeu->setConsigne($data['consigne'] ?? null);
        $miniJeu->setListe($data['liste'] ?? null);
        $miniJeu->setListeParGroupe($data['liste_par_groupe'] ?? null);
        $miniJeu->setType1($data['type_1'] ?? null);
        $miniJeu->setType2($data['type_2'] ?? null);
        $miniJeu->setPropositions($data['propositions'] ?? null);
        $miniJeu->setReponses($data['reponses'] ?? null);
        $miniJeu->setTypeReponse($data['type_reponse'] ?? null);

        $em->persist($miniJeu);
        $em->flush();

        return $this->corsResponse(new JsonResponse($this->serializeMiniJeu($miniJeu), 201));
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

        $miniJeu = $em->getRepository(MiniJeu::class)->find($id);
        if (!$miniJeu) {
            return $this->corsResponse(new JsonResponse(['message' => 'Mini jeu non trouvé.'], 404));
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (!empty($data['type'] ?? null)) {
            $miniJeu->setType($data['type']);
        }
        if (!empty($data['question'] ?? null)) {
            $miniJeu->setQuestion($data['question']);
        }
        if (\array_key_exists('type_reponses', $data)) {
            $miniJeu->setTypeReponses($data['type_reponses']);
        }
        if (\array_key_exists('image_question', $data)) {
            $miniJeu->setImageQuestion($data['image_question']);
        }
        if (\array_key_exists('explication', $data)) {
            $miniJeu->setExplication($data['explication']);
        }
        if (\array_key_exists('ordre', $data)) {
            $miniJeu->setOrdre($data['ordre']);
        }

        // Propriétés spécifiques
        if (\array_key_exists('bonnes_reponses', $data)) {
            $miniJeu->setBonnesReponses($data['bonnes_reponses']);
        }
        if (\array_key_exists('mauvaises_reponses', $data)) {
            $miniJeu->setMauvaisesReponses($data['mauvaises_reponses']);
        }
        if (\array_key_exists('reponse', $data)) {
            $miniJeu->setReponse($data['reponse']);
        }
        if (\array_key_exists('formule', $data)) {
            $miniJeu->setFormule($data['formule']);
        }
        if (\array_key_exists('type_variable', $data)) {
            $miniJeu->setTypeVariable($data['type_variable']);
        }
        if (\array_key_exists('fausse_reponse', $data)) {
            $miniJeu->setFausseReponse($data['fausse_reponse']);
        }
        if (\array_key_exists('texte', $data)) {
            $miniJeu->setTexte($data['texte']);
        }
        if (\array_key_exists('distracteur', $data)) {
            $miniJeu->setDistracteur($data['distracteur']);
        }
        if (\array_key_exists('consigne', $data)) {
            $miniJeu->setConsigne($data['consigne']);
        }
        if (\array_key_exists('liste', $data)) {
            $miniJeu->setListe($data['liste']);
        }
        if (\array_key_exists('liste_par_groupe', $data)) {
            $miniJeu->setListeParGroupe($data['liste_par_groupe']);
        }
        if (\array_key_exists('type_1', $data)) {
            $miniJeu->setType1($data['type_1']);
        }
        if (\array_key_exists('type_2', $data)) {
            $miniJeu->setType2($data['type_2']);
        }
        if (\array_key_exists('propositions', $data)) {
            $miniJeu->setPropositions($data['propositions']);
        }
        if (\array_key_exists('reponses', $data)) {
            $miniJeu->setReponses($data['reponses']);
        }
        if (\array_key_exists('type_reponse', $data)) {
            $miniJeu->setTypeReponse($data['type_reponse']);
        }

        $em->flush();

        return $this->corsResponse(new JsonResponse($this->serializeMiniJeu($miniJeu), 200));
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

        $miniJeu = $em->getRepository(MiniJeu::class)->find($id);
        if (!$miniJeu) {
            return $this->corsResponse(new JsonResponse(['message' => 'Mini jeu non trouvé.'], 404));
        }

        $em->remove($miniJeu);
        $em->flush();

        return $this->corsResponse(new JsonResponse(['message' => 'Mini jeu supprimé avec succès.'], 200));
    }

    private function serializeMiniJeu(MiniJeu $miniJeu): array
    {
        return [
            'id' => $miniJeu->getId(),
            'type' => $miniJeu->getType(),
            'type_reponses' => $miniJeu->getTypeReponses(),
            'question' => $miniJeu->getQuestion(),
            'image_question' => $miniJeu->getImageQuestion(),
            'bonnes_reponses' => $miniJeu->getBonnesReponses(),
            'mauvaises_reponses' => $miniJeu->getMauvaisesReponses(),
            'reponse' => $miniJeu->getReponse(),
            'formule' => $miniJeu->getFormule(),
            'type_variable' => $miniJeu->getTypeVariable(),
            'fausse_reponse' => $miniJeu->getFausseReponse(),
            'texte' => $miniJeu->getTexte(),
            'distracteur' => $miniJeu->getDistracteur(),
            'consigne' => $miniJeu->getConsigne(),
            'liste' => $miniJeu->getListe(),
            'liste_par_groupe' => $miniJeu->getListeParGroupe(),
            'type_1' => $miniJeu->getType1(),
            'type_2' => $miniJeu->getType2(),
            'propositions' => $miniJeu->getPropositions(),
            'reponses' => $miniJeu->getReponses(),
            'type_reponse' => $miniJeu->getTypeReponse(),
            'explication' => $miniJeu->getExplication(),
            'ordre' => $miniJeu->getOrdre(),
            'chapitre_id' => $miniJeu->getChapitre()?->getId(),
            'module_validation_id' => $miniJeu->getModuleValidation()?->getId(),
        ];
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


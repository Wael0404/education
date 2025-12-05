<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'mini_jeu')]
class MiniJeu
{
    // Types de mini jeux
    public const TYPE_QCM_MULTI = 'QCM_Multi';
    public const TYPE_QCM_UNIQUE = 'QCM_unique';
    public const TYPE_QCM_CALCUL = 'QCM_calcul';
    public const TYPE_TEXTE_A_TROU = 'Texte_a_trou';
    public const TYPE_ORDRE = 'Ordre';
    public const TYPE_ORDRE_GROUPE = 'Ordre_groupe';
    public const TYPE_ASSOCIER = 'Associer';
    public const TYPE_QUESTION_OUVERTE = 'Question_ouverte';

    // Types de réponses
    public const REPONSE_TYPE_TEXTE = 'TEXTE';
    public const REPONSE_TYPE_IMAGE = 'IMAGE';
    public const REPONSE_TYPE_GRAPHE = 'graphe';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $type; // QCM_Multi, QCM_unique, QCM_calcul, etc.

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $typeReponses = null; // TEXTE, IMAGE, graphe

    #[ORM\Column(type: Types::TEXT)]
    private string $question;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $imageQuestion = null; // URL de l'image optionnelle

    // Pour QCM_Multi et QCM_unique
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $bonnesReponses = null; // Séparées par des points-virgules

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $mauvaisesReponses = null; // Séparées par des points-virgules

    // Pour QCM_unique - une seule bonne réponse
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reponse = null;

    // Pour QCM_calcul
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $formule = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $typeVariable = null; // JSON avec les variables et leurs valeurs

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $fausseReponse = null; // Pour QCM_calcul

    // Pour Texte_a_trou
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $texte = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $distracteur = null;

    // Pour Ordre et Ordre_groupe
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $consigne = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $liste = null; // Éléments séparés par des points-virgules

    // Pour Ordre_groupe
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $listeParGroupe = null; // JSON avec groupes

    // Pour Associer
    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $type1 = null; // Texte, Image, Graphe

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $type2 = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $propositions = null; // JSON avec les paires

    // Pour Question_ouverte
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reponses = null; // Réponses acceptées séparées par des points-virgules

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $typeReponse = null; // texte, valeur

    // Explication commune à tous les types
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $explication = null;

    #[ORM\ManyToOne(targetEntity: ModuleValidation::class, inversedBy: 'miniJeux')]
    #[ORM\JoinColumn(name: 'module_validation_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?ModuleValidation $moduleValidation = null;

    #[ORM\ManyToOne(targetEntity: Chapitre::class, inversedBy: 'miniJeux')]
    #[ORM\JoinColumn(name: 'chapitre_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Chapitre $chapitre = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $ordre = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getTypeReponses(): ?string
    {
        return $this->typeReponses;
    }

    public function setTypeReponses(?string $typeReponses): self
    {
        $this->typeReponses = $typeReponses;
        return $this;
    }

    public function getQuestion(): string
    {
        return $this->question;
    }

    public function setQuestion(string $question): self
    {
        $this->question = $question;
        return $this;
    }

    public function getImageQuestion(): ?string
    {
        return $this->imageQuestion;
    }

    public function setImageQuestion(?string $imageQuestion): self
    {
        $this->imageQuestion = $imageQuestion;
        return $this;
    }

    public function getBonnesReponses(): ?string
    {
        return $this->bonnesReponses;
    }

    public function setBonnesReponses(?string $bonnesReponses): self
    {
        $this->bonnesReponses = $bonnesReponses;
        return $this;
    }

    public function getMauvaisesReponses(): ?string
    {
        return $this->mauvaisesReponses;
    }

    public function setMauvaisesReponses(?string $mauvaisesReponses): self
    {
        $this->mauvaisesReponses = $mauvaisesReponses;
        return $this;
    }

    public function getReponse(): ?string
    {
        return $this->reponse;
    }

    public function setReponse(?string $reponse): self
    {
        $this->reponse = $reponse;
        return $this;
    }

    public function getFormule(): ?string
    {
        return $this->formule;
    }

    public function setFormule(?string $formule): self
    {
        $this->formule = $formule;
        return $this;
    }

    public function getTypeVariable(): ?string
    {
        return $this->typeVariable;
    }

    public function setTypeVariable(?string $typeVariable): self
    {
        $this->typeVariable = $typeVariable;
        return $this;
    }

    public function getFausseReponse(): ?string
    {
        return $this->fausseReponse;
    }

    public function setFausseReponse(?string $fausseReponse): self
    {
        $this->fausseReponse = $fausseReponse;
        return $this;
    }

    public function getTexte(): ?string
    {
        return $this->texte;
    }

    public function setTexte(?string $texte): self
    {
        $this->texte = $texte;
        return $this;
    }

    public function getDistracteur(): ?string
    {
        return $this->distracteur;
    }

    public function setDistracteur(?string $distracteur): self
    {
        $this->distracteur = $distracteur;
        return $this;
    }

    public function getConsigne(): ?string
    {
        return $this->consigne;
    }

    public function setConsigne(?string $consigne): self
    {
        $this->consigne = $consigne;
        return $this;
    }

    public function getListe(): ?string
    {
        return $this->liste;
    }

    public function setListe(?string $liste): self
    {
        $this->liste = $liste;
        return $this;
    }

    public function getListeParGroupe(): ?string
    {
        return $this->listeParGroupe;
    }

    public function setListeParGroupe(?string $listeParGroupe): self
    {
        $this->listeParGroupe = $listeParGroupe;
        return $this;
    }

    public function getType1(): ?string
    {
        return $this->type1;
    }

    public function setType1(?string $type1): self
    {
        $this->type1 = $type1;
        return $this;
    }

    public function getType2(): ?string
    {
        return $this->type2;
    }

    public function setType2(?string $type2): self
    {
        $this->type2 = $type2;
        return $this;
    }

    public function getPropositions(): ?string
    {
        return $this->propositions;
    }

    public function setPropositions(?string $propositions): self
    {
        $this->propositions = $propositions;
        return $this;
    }

    public function getReponses(): ?string
    {
        return $this->reponses;
    }

    public function setReponses(?string $reponses): self
    {
        $this->reponses = $reponses;
        return $this;
    }

    public function getTypeReponse(): ?string
    {
        return $this->typeReponse;
    }

    public function setTypeReponse(?string $typeReponse): self
    {
        $this->typeReponse = $typeReponse;
        return $this;
    }

    public function getExplication(): ?string
    {
        return $this->explication;
    }

    public function setExplication(?string $explication): self
    {
        $this->explication = $explication;
        return $this;
    }

    public function getModuleValidation(): ?ModuleValidation
    {
        return $this->moduleValidation;
    }

    public function setModuleValidation(?ModuleValidation $moduleValidation): self
    {
        $this->moduleValidation = $moduleValidation;
        return $this;
    }

    public function getChapitre(): ?Chapitre
    {
        return $this->chapitre;
    }

    public function setChapitre(?Chapitre $chapitre): self
    {
        $this->chapitre = $chapitre;
        return $this;
    }

    public function getOrdre(): ?int
    {
        return $this->ordre;
    }

    public function setOrdre(?int $ordre): self
    {
        $this->ordre = $ordre;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTimeImmutable $createdAt): self
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): self
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }
}


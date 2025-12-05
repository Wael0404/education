<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'chapitre')]
class Chapitre
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $titre;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $contenu = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $ordre = null;

    #[ORM\ManyToOne(targetEntity: Matiere::class, inversedBy: 'chapitres')]
    #[ORM\JoinColumn(name: 'matiere_id', referencedColumnName: 'id', nullable: false)]
    private Matiere $matiere;

    #[ORM\OneToMany(targetEntity: Paragraphe::class, mappedBy: 'chapitre', cascade: ['persist', 'remove'])]
    private Collection $paragraphes;

    #[ORM\OneToMany(targetEntity: ModuleValidation::class, mappedBy: 'chapitre', cascade: ['persist', 'remove'])]
    private Collection $modulesValidation;

    #[ORM\OneToMany(targetEntity: MiniJeu::class, mappedBy: 'chapitre', cascade: ['persist', 'remove'])]
    private Collection $miniJeux;

    #[ORM\OneToMany(targetEntity: Exercice::class, mappedBy: 'chapitre', cascade: ['persist', 'remove'])]
    private Collection $exercices;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->paragraphes = new ArrayCollection();
        $this->modulesValidation = new ArrayCollection();
        $this->miniJeux = new ArrayCollection();
        $this->exercices = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitre(): string
    {
        return $this->titre;
    }

    public function setTitre(string $titre): self
    {
        $this->titre = $titre;
        return $this;
    }

    public function getContenu(): ?string
    {
        return $this->contenu;
    }

    public function setContenu(?string $contenu): self
    {
        $this->contenu = $contenu;
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

    public function getMatiere(): Matiere
    {
        return $this->matiere;
    }

    public function setMatiere(Matiere $matiere): self
    {
        $this->matiere = $matiere;
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

    /**
     * @return Collection<int, Paragraphe>
     */
    public function getParagraphes(): Collection
    {
        return $this->paragraphes;
    }

    public function addParagraphe(Paragraphe $paragraphe): self
    {
        if (!$this->paragraphes->contains($paragraphe)) {
            $this->paragraphes->add($paragraphe);
            $paragraphe->setChapitre($this);
        }
        return $this;
    }

    public function removeParagraphe(Paragraphe $paragraphe): self
    {
        if ($this->paragraphes->removeElement($paragraphe)) {
            if ($paragraphe->getChapitre() === $this) {
                $paragraphe->setChapitre(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, ModuleValidation>
     */
    public function getModulesValidation(): Collection
    {
        return $this->modulesValidation;
    }

    public function addModuleValidation(ModuleValidation $moduleValidation): self
    {
        if (!$this->modulesValidation->contains($moduleValidation)) {
            $this->modulesValidation->add($moduleValidation);
            $moduleValidation->setChapitre($this);
        }
        return $this;
    }

    public function removeModuleValidation(ModuleValidation $moduleValidation): self
    {
        if ($this->modulesValidation->removeElement($moduleValidation)) {
            if ($moduleValidation->getChapitre() === $this) {
                $moduleValidation->setChapitre(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, MiniJeu>
     */
    public function getMiniJeux(): Collection
    {
        return $this->miniJeux;
    }

    public function addMiniJeu(MiniJeu $miniJeu): self
    {
        if (!$this->miniJeux->contains($miniJeu)) {
            $this->miniJeux->add($miniJeu);
            $miniJeu->setChapitre($this);
        }
        return $this;
    }

    public function removeMiniJeu(MiniJeu $miniJeu): self
    {
        if ($this->miniJeux->removeElement($miniJeu)) {
            if ($miniJeu->getChapitre() === $this) {
                $miniJeu->setChapitre(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, Exercice>
     */
    public function getExercices(): Collection
    {
        return $this->exercices;
    }

    public function addExercice(Exercice $exercice): self
    {
        if (!$this->exercices->contains($exercice)) {
            $this->exercices->add($exercice);
            $exercice->setChapitre($this);
        }
        return $this;
    }

    public function removeExercice(Exercice $exercice): self
    {
        if ($this->exercices->removeElement($exercice)) {
            if ($exercice->getChapitre() === $this) {
                $exercice->setChapitre(null);
            }
        }
        return $this;
    }
}


<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'module_validation')]
class ModuleValidation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $contenu = null;

    #[ORM\ManyToOne(targetEntity: Chapitre::class, inversedBy: 'modulesValidation')]
    #[ORM\JoinColumn(name: 'chapitre_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Chapitre $chapitre;

    #[ORM\OneToMany(targetEntity: AnimationMaison::class, mappedBy: 'moduleValidation', cascade: ['persist', 'remove'])]
    private Collection $animationsMaison;

    #[ORM\OneToMany(targetEntity: MiniJeu::class, mappedBy: 'moduleValidation', cascade: ['persist', 'remove'])]
    private Collection $miniJeux;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->animationsMaison = new ArrayCollection();
        $this->miniJeux = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    public function getChapitre(): Chapitre
    {
        return $this->chapitre;
    }

    public function setChapitre(Chapitre $chapitre): self
    {
        $this->chapitre = $chapitre;
        return $this;
    }

    /**
     * @return Collection<int, AnimationMaison>
     */
    public function getAnimationsMaison(): Collection
    {
        return $this->animationsMaison;
    }

    public function addAnimationMaison(AnimationMaison $animationMaison): self
    {
        if (!$this->animationsMaison->contains($animationMaison)) {
            $this->animationsMaison->add($animationMaison);
            $animationMaison->setModuleValidation($this);
        }
        return $this;
    }

    public function removeAnimationMaison(AnimationMaison $animationMaison): self
    {
        if ($this->animationsMaison->removeElement($animationMaison)) {
            if ($animationMaison->getModuleValidation() === $this) {
                $animationMaison->setModuleValidation(null);
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
            $miniJeu->setModuleValidation($this);
        }
        return $this;
    }

    public function removeMiniJeu(MiniJeu $miniJeu): self
    {
        if ($this->miniJeux->removeElement($miniJeu)) {
            if ($miniJeu->getModuleValidation() === $this) {
                $miniJeu->setModuleValidation(null);
            }
        }
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


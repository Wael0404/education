<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'exercice')]
class Exercice
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $contenu;

    #[ORM\ManyToOne(targetEntity: Chapitre::class, inversedBy: 'exercices')]
    #[ORM\JoinColumn(name: 'chapitre_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Chapitre $chapitre;

    #[ORM\OneToMany(targetEntity: QuestionReponse::class, mappedBy: 'exercice', cascade: ['persist', 'remove'])]
    private Collection $questionsReponses;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $ordre = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->questionsReponses = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getContenu(): string
    {
        return $this->contenu;
    }

    public function setContenu(string $contenu): self
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
     * @return Collection<int, QuestionReponse>
     */
    public function getQuestionsReponses(): Collection
    {
        return $this->questionsReponses;
    }

    public function addQuestionReponse(QuestionReponse $questionReponse): self
    {
        if (!$this->questionsReponses->contains($questionReponse)) {
            $this->questionsReponses->add($questionReponse);
            $questionReponse->setExercice($this);
        }
        return $this;
    }

    public function removeQuestionReponse(QuestionReponse $questionReponse): self
    {
        if ($this->questionsReponses->removeElement($questionReponse)) {
            if ($questionReponse->getExercice() === $this) {
                $questionReponse->setExercice(null);
            }
        }
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


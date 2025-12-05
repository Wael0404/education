<?php

namespace App\EventListener;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class CorsListener implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 256],
            KernelEvents::RESPONSE => ['onKernelResponse', -256],
            KernelEvents::EXCEPTION => ['onKernelException', -128],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        // Ne pas traiter si ce n'est pas la requête principale
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        // Gérer les requêtes OPTIONS (preflight) - priorité élevée pour intercepter avant le routage
        if ($request->getMethod() === 'OPTIONS') {
            $response = new Response();
            $response->setStatusCode(204);
            $response->headers->set('Access-Control-Allow-Origin', '*');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            $response->headers->set('Access-Control-Max-Age', '3600');
            $event->setResponse($response);
            $event->stopPropagation(); // Empêcher le traitement ultérieur
        }
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        // Ne pas traiter si ce n'est pas la requête principale
        if (!$event->isMainRequest()) {
            return;
        }

        $response = $event->getResponse();
        if ($response) {
            $this->addCorsHeaders($response);
        }
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        // Ne pas traiter si ce n'est pas la requête principale
        if (!$event->isMainRequest()) {
            return;
        }

        $response = $event->getResponse();
        if ($response) {
            $this->addCorsHeaders($response);
        }
    }

    private function addCorsHeaders(Response $response): void
    {
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
}


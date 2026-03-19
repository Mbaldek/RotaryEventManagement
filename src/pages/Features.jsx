import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, LayoutGrid, Users, Calendar, MessageSquare, Megaphone, Download, Archive, Shield, FileUp, Palette, BookmarkCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Features() {
  const features = [
    {
      icon: MessageSquare,
      color: "purple",
      title: "Feedback & Support",
      description: "Système de retour utilisateur intégré.",
      details: [
        "Bouton flottant présent sur toutes les pages",
        "Signalement d'erreurs en un clic",
        "Propositions d'amélioration",
        "Commentaires et suggestions",
        "Envoi par email automatique",
        "Identifie automatiquement l'utilisateur"
      ]
    },
    {
      icon: LayoutGrid,
      color: "amber",
      title: "Gestion des tables",
      description: "Créez et gérez plusieurs tables pour votre événement. Chaque table peut accueillir 8 convives, ou 12 pour la table présidentielle.",
      details: [
        "Ajout de tables standard (8 sièges) ou présidentielle (12 sièges)",
        "Personnalisation de la forme (ronde/carrée), couleur et rotation",
        "Suppression des tables non présidentielles",
        "Vue en temps réel de l'occupation"
      ]
    },
    {
      icon: Users,
      color: "green",
      title: "Enregistrement des convives",
      description: "Les convives peuvent s'enregistrer directement sur leur siège en renseignant leurs informations.",
      details: [
        "Formulaire d'inscription avec prénom, nom, métier, email, téléphone",
        "Numéro de membre et commentaires optionnels",
        "Visualisation en temps réel des sièges occupés",
        "Modification ou suppression de l'enregistrement"
      ]
    },
    {
      icon: BookmarkCheck,
      color: "blue",
      title: "Système de réservations",
      description: "Gérez les réservations de groupe pour les mercredis à venir avec assignation automatique des tables.",
      details: [
        "Demande de réservation avec nombre de personnes et date",
        "Confirmation ou annulation des réservations",
        "Lancement automatique : assignation d'une table et création des sièges réservés",
        "Libération des sièges si la réservation est annulée"
      ]
    },

    {
      icon: Megaphone,
      color: "orange",
      title: "Diffusion de messages",
      description: "Diffusez des annonces importantes à toutes les tables ou à une table spécifique.",
      details: [
        "Message global visible par tous les convives",
        "Message ciblé par table",
        "Notifications en temps réel"
      ]
    },
    {
      icon: FileUp,
      color: "indigo",
      title: "Documents de planning (PDF)",
      description: "Upload et accès aux documents de planification.",
      details: [
        "Upload de planning global dans Administration",
        "Visible depuis toutes les tables",
        "Accessible via bannière sur chaque table",
        "Format PDF recommandé",
        "Lien d'accès direct",
        "Mise à jour en temps réel"
      ]
    },
    {
      icon: Calendar,
      color: "teal",
      title: "Calendrier d'événements",
      description: "Vue calendrier complète avec événements passés, présents et futurs.",
      details: [
        "Vue calendrier visuelle avec navigation mensuelle",
        "Accessible depuis page d'accueil et tables (bouton dédié)",
        "N'importe quelle date avec heures de début/fin",
        "Déjeuner statutaire : conférencier, fonction, thème",
        "Réunion commission : commission",
        "Soirée : thème, lieu, autres informations",
        "Autre événement : thème, lieu, commission, autres informations",
        "Événements récurrents (hebdo, bihebdo, mensuel)",
        "Filtrage : À venir / Tous / Archives"
      ]
    },
    {
      icon: Download,
      color: "cyan",
      title: "Export CSV",
      description: "Exportez la liste complète des convives avec toutes leurs informations.",
      details: [
        "Export de tous les convives enregistrés",
        "Colonnes : table, siège, prénom, nom, métier, email, téléphone",
        "Format compatible Excel et Google Sheets"
      ]
    },
    {
      icon: Archive,
      color: "red",
      title: "Lancement d'événements",
      description: "Lancez un événement planifié avec archivage automatique et configuration guidée.",
      details: [
        "Wizard en 3 étapes avec validation",
        "Archivage automatique de l'événement précédent",
        "Option de conservation des tables existantes",
        "Configuration automatique du conférencier et planning"
      ]
    },
    {
      icon: Shield,
      color: "slate",
      title: "Gestion des utilisateurs",
      description: "Invitez et gérez les utilisateurs avec différents niveaux d'accès.",
      details: [
        "Invitation par email avec rôle (user/admin)",
        "Suppression d'utilisateurs",
        "Les admins ont accès au panneau de contrôle",
        "Les users peuvent consulter et s'enregistrer"
      ]
    },
    {
      icon: Palette,
      color: "pink",
      title: "Personnalisation des tables",
      description: "Personnalisez l'apparence de chaque table pour une meilleure organisation visuelle.",
      details: [
        "Choix de la forme (ronde/carrée)",
        "8 couleurs disponibles",
        "Rotation de 0 à 360 degrés",
        "Aperçu en temps réel"
      ]
    },
    {
      icon: UserPlus,
      color: "lime",
      title: "Notifications en temps réel",
      description: "Recevez des notifications pour tous les événements importants.",
      details: [
        "Nouvelle occupation de siège",
        "Nouveau message reçu",
        "Diffusion de message global ou par table",
        "Changement de statut de réservation"
      ]
    }
  ];

  const colorClasses = {
    amber: "bg-amber-100 text-amber-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    indigo: "bg-indigo-100 text-indigo-600",
    teal: "bg-teal-100 text-teal-600",
    cyan: "bg-cyan-100 text-cyan-600",
    red: "bg-red-100 text-red-600",
    slate: "bg-slate-100 text-slate-600",
    pink: "bg-pink-100 text-pink-600",
    lime: "bg-lime-100 text-lime-600",
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={createPageUrl("AdminControl")}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-stone-800">Fonctionnalités</h1>
            <p className="text-sm text-stone-400">
              Documentation complète du système de gestion de réunion
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const colorClass = colorClasses[feature.color];
            return (
              <Card key={idx} className="border-stone-200 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-stone-800">{feature.title}</CardTitle>
                      <p className="text-sm text-stone-500 mt-1">{feature.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, detailIdx) => (
                      <li key={detailIdx} className="flex items-start gap-2 text-sm text-stone-600">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Conseils d'utilisation</h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Planifiez vos événements à l'avance dans le calendrier</li>
              <li>• Utilisez le bouton "Lancer" pour configurer automatiquement un événement</li>
              <li>• Conservez vos tables configurées d'un événement à l'autre</li>
              <li>• Les réservations sont limitées aux 7 prochains jours</li>
              <li>• Consultez l'historique dans les archives</li>
            </ul>
          </CardContent>
        </Card>

        {/* Back button */}
        <div className="flex justify-center pt-4">
          <Link to={createPageUrl("AdminControl")}>
            <Button variant="outline" className="border-stone-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au panneau de contrôle
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
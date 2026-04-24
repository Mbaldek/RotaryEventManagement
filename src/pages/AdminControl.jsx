import React, { useState } from "react";
import { RestaurantTable, Seat, GlobalSettings, EventHistory, Reservation, Chat, getCurrentUser, uploadFile } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Trash2, Megaphone, Download, MessageSquareX, Settings, ExternalLink, Home, Palette, LayoutGrid, Archive, CalendarCheck, BookOpen, Shield, Calendar, FileUp, Pencil, X
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { getTableCapacity } from "@/lib/utils";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import TableCustomizer from "../components/admin/TableCustomizer";

export default function AdminControl() {
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [newTableCount, setNewTableCount] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: "", message: "" });
  const [customizingTable, setCustomizingTable] = useState(null);
  const [globalPlanningUrl, setGlobalPlanningUrl] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: allSeats = [] } = useQuery({
    queryKey: ["allSeats"],
    queryFn: () => Seat.list(),
  });



  const { data: settings } = useQuery({
    queryKey: ["globalSettings"],
    queryFn: async () => {
      const s = await GlobalSettings.list();
      return s[0] || null;
    },
  });

  // Load global planning URL when settings change
  React.useEffect(() => {
    if (settings?.planning_url) {
      setGlobalPlanningUrl(settings.planning_url);
    }
  }, [settings]);

  // Add tables
  const addTablesMutation = useMutation({
    mutationFn: async (count) => {
      const maxNum = tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) : 0;
      const newTables = [];
      for (let i = 1; i <= count; i++) {
        newTables.push({ table_number: maxNum + i, is_presidential: false });
      }
      await RestaurantTable.bulkCreate(newTables);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      toast.success("Tables ajoutées");
    },
  });

  // Add presidential table
  const addPresidentialTableMutation = useMutation({
    mutationFn: async () => {
      await RestaurantTable.create({
        table_number: 0,
        is_presidential: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      toast.success("Table présidentielle créée");
    },
  });

  // Reset all seats with archival
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      // Get current user email
      const currentUser = await getCurrentUser();
      
      // Archive current event
      const occupiedSeats = allSeats.filter(s => s.first_name);
      if (occupiedSeats.length > 0) {
        const archiveData = {
          event_date: new Date().toISOString().split('T')[0],
          speaker_name: settings?.speaker_name || "",
          speaker_theme: settings?.speaker_theme || "",
          total_guests: occupiedSeats.length,
          seats_data: occupiedSeats,
          tables_data: tables,
          archived_by: currentUser?.email || "",
        };
        await EventHistory.create(archiveData);
      }

      // Reset all seats
      for (const seat of allSeats) {
        if (seat.first_name || seat.is_reserved) {
          await Seat.update(seat.id, {
            first_name: "", 
            last_name: "", 
            job: "", 
            email: "", 
            phone: "", 
            member_number: "", 
            comment: "", 
            guest_token: "",
            is_reserved: false,
            reserved_by: "",
            reservation_id: "",
          });
        }
      }

      // Delete only past reservations (date < today)
      const today = new Date().toISOString().split('T')[0];
      const reservations = await Reservation.list();
      const pastReservations = reservations.filter(r => r.reservation_date < today);
      for (const res of pastReservations) {
        await Reservation.delete(res.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["eventHistory"] });
      toast.success("Événement archivé et sièges réinitialisés");
    },
  });

  // Broadcast message
  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (broadcastTarget === "all") {
        if (settings?.id) {
          await GlobalSettings.update(settings.id, { global_broadcast: broadcastMsg });
        } else {
          await GlobalSettings.create({ global_broadcast: broadcastMsg });
        }
      } else {
        await RestaurantTable.update(broadcastTarget, { broadcast_message: broadcastMsg });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalSettings"] });
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      setBroadcastMsg("");
      toast.success("Message diffusé");
    },
  });

  const handleBroadcast = () => {
    const target = broadcastTarget === "all" ? "toutes les tables" : `la table ${tables.find(t => t.id === broadcastTarget)?.table_number}`;
    setConfirmDialog({
      isOpen: true,
      action: () => broadcastMutation.mutate(),
      title: "Diffuser un message",
      message: `Vous êtes sur le point de diffuser un message à ${target}. Cette action est irréversible.`
    });
  };

  // Active broadcasts (global + per table with non-empty message)
  const activeBroadcasts = React.useMemo(() => {
    const list = [];
    if (settings?.global_broadcast?.trim()) {
      list.push({ id: "all", label: "Toutes les tables", message: settings.global_broadcast });
    }
    tables.forEach(t => {
      if (t.broadcast_message?.trim()) {
        list.push({
          id: t.id,
          label: t.is_presidential ? "★ Table Présidentielle" : `Table ${t.table_number}`,
          message: t.broadcast_message,
        });
      }
    });
    return list;
  }, [settings, tables]);

  const clearBroadcastMutation = useMutation({
    mutationFn: async (targetId) => {
      if (targetId === "all") {
        if (settings?.id) {
          await GlobalSettings.update(settings.id, { global_broadcast: "" });
        }
      } else {
        await RestaurantTable.update(targetId, { broadcast_message: "" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalSettings"] });
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      toast.success("Message supprimé");
    },
  });

  const handleEditBroadcast = (b) => {
    setBroadcastTarget(b.id);
    setBroadcastMsg(b.message);
  };



  // Clear all chat — chat_messages is locked by RLS, so go through the RPC.
  const clearChatMutation = useMutation({
    mutationFn: () => Chat.adminClearAll(),
    onSuccess: () => {
      toast.success("Messagerie nettoyée");
    },
    onError: (err) => {
      console.error("[AdminControl:clearChat]", err);
      toast.error("Échec du nettoyage de la messagerie");
    },
  });

  // Export CSV
  const exportCSV = () => {
    const occupiedSeats = allSeats.filter(s => s.first_name);
    if (occupiedSeats.length === 0) {
      toast.error("Aucun convive à exporter");
      return;
    }
    const headers = ["Table", "Siège", "Prénom", "Nom", "Métier", "Email", "Téléphone"];
    const rows = occupiedSeats.map(seat => {
      const table = tables.find(t => t.id === seat.table_id);
      return [
        table?.table_number || "",
        seat.seat_number,
        seat.first_name || "",
        seat.last_name || "",
        seat.job || "",
        seat.email || "",
        seat.phone || "",
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convives_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export terminé");
  };

  // Delete a table
  const deleteTableMutation = useMutation({
    mutationFn: async (tableId) => {
      const tableSeats = allSeats.filter(s => s.table_id === tableId);
      for (const seat of tableSeats) {
        await Seat.delete(seat.id);
      }
      await RestaurantTable.delete(tableId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      toast.success("Table supprimée");
    },
  });

  const handleDeleteTable = (tableId, tableNumber) => {
    setConfirmDialog({
      isOpen: true,
      action: () => deleteTableMutation.mutate(tableId),
      title: "Supprimer la table",
      message: `Vous êtes sur le point de supprimer la table ${tableNumber} et tous ses sièges. Cette action est irréversible.`
    });
  };

  // Upload global planning
  const handleGlobalPlanningUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await uploadFile(file);
    setGlobalPlanningUrl(file_url);
    
    if (settings?.id) {
      await GlobalSettings.update(settings.id, { planning_url: file_url });
    } else {
      await GlobalSettings.create({ planning_url: file_url });
    }
    queryClient.invalidateQueries({ queryKey: ["globalSettings"] });
    toast.success("Planning global uploadé");
  };

  const handleResetAll = () => {
    setConfirmDialog({
      isOpen: true,
      action: () => resetAllMutation.mutate(),
      title: "Archiver et réinitialiser",
      message: "Vous êtes sur le point d'archiver l'événement actuel et de réinitialiser tous les sièges. Les données seront sauvegardées dans l'historique avant le nettoyage complet."
    });
  };

  const handleClearChat = () => {
    setConfirmDialog({
      isOpen: true,
      action: () => clearChatMutation.mutate(),
      title: "Nettoyer toutes les messageries",
      message: "Vous êtes sur le point de supprimer tous les messages de chat. Cette action est irréversible."
    });
  };



  // Customize table
  const customizeTableMutation = useMutation({
    mutationFn: async ({ tableId, data }) => {
      await RestaurantTable.update(tableId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      setCustomizingTable(null);
      toast.success("Table personnalisée");
    },
  });

  const totalOccupied = allSeats.filter(s => s.first_name).length;
  const hasPresidentialTable = tables.some(t => t.is_presidential);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-800">Panneau de contrôle</h1>
              <p className="text-sm text-stone-400">
                {tables.length} table{tables.length > 1 ? "s" : ""} · {totalOccupied} convive{totalOccupied > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl("Index"))}
              className="border-stone-300 hover:bg-stone-100"
            >
              <Home className="w-4 h-4 mr-2" />
              Accueil
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="border-stone-300 hover:bg-stone-100"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Vue d'ensemble
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl("Features"))}
              className="border-amber-300 hover:bg-amber-50 text-amber-700"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Doc
            </Button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate(createPageUrl("EventPlanning"))}
            className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-lg hover:border-amber-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-stone-800">Planning</p>
            <p className="text-xs text-stone-500 mt-1">Conférencier & thème</p>
          </button>

          <button
            onClick={() => navigate(createPageUrl("Reservations"))}
            className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <CalendarCheck className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-stone-800">Réservations</p>
            <p className="text-xs text-stone-500 mt-1">Gérer les demandes</p>
          </button>

          <button
            onClick={() => navigate(createPageUrl("UserManagement"))}
            className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-stone-800">Utilisateurs</p>
            <p className="text-xs text-stone-500 mt-1">Invitations & rôles</p>
          </button>

          <button
            onClick={() => navigate(createPageUrl("Archives"))}
            className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-lg hover:border-purple-300 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
              <Archive className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm font-semibold text-stone-800">Archives</p>
            <p className="text-xs text-stone-500 mt-1">Historique</p>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Tables */}
          <Card className="border-stone-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                Ajouter des tables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={newTableCount}
                  onChange={e => setNewTableCount(parseInt(e.target.value) || 1)}
                  className="w-20 border-stone-200"
                />
                <Button
                  onClick={() => addTablesMutation.mutate(newTableCount)}
                  disabled={addTablesMutation.isPending}
                  className="bg-stone-800 hover:bg-stone-900"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
              {!hasPresidentialTable && (
                <Button
                  onClick={() => addPresidentialTableMutation.mutate()}
                  disabled={addPresidentialTableMutation.isPending}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  ★ Créer table présidentielle (12 sièges)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Broadcast */}
          <Card className="border-stone-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-600" />
                Diffuser un message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeBroadcasts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Messages actifs
                  </p>
                  {activeBroadcasts.map(b => (
                    <div
                      key={b.id}
                      className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-700">{b.label}</p>
                        <p className="text-sm text-stone-700 break-words">{b.message}</p>
                      </div>
                      <button
                        onClick={() => handleEditBroadcast(b)}
                        className="p-1 text-stone-500 hover:text-stone-700 shrink-0"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => clearBroadcastMutation.mutate(b.id)}
                        disabled={clearBroadcastMutation.isPending}
                        className="p-1 text-stone-500 hover:text-red-600 shrink-0 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                <SelectTrigger className="border-stone-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les tables</SelectItem>
                  {tables.map(t => (
                    <SelectItem key={t.id} value={t.id}>Table {t.table_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Votre message..."
                className="border-stone-200 resize-none"
                rows={2}
              />
              <Button
                onClick={handleBroadcast}
                disabled={!broadcastMsg.trim() || broadcastMutation.isPending}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Diffuser
              </Button>
            </CardContent>
          </Card>





          {/* Global Planning */}
          <Card className="border-stone-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileUp className="w-4 h-4 text-blue-600" />
                Planning global (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label
                htmlFor="global-planning-upload"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <FileUp className="w-5 h-5 text-stone-400" />
                <span className="text-sm text-stone-500">
                  {globalPlanningUrl ? "Document chargé ✓" : "Uploader un planning"}
                </span>
              </Label>
              <input
                id="global-planning-upload"
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleGlobalPlanningUpload}
              />
              {globalPlanningUrl && (
                <a
                  href={globalPlanningUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir le document
                </a>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-stone-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-red-600" />
                Actions globales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start border-stone-200 text-stone-700 hover:bg-stone-50"
                onClick={handleResetAll}
                disabled={resetAllMutation.isPending}
              >
                <Archive className="w-4 h-4 mr-2 text-orange-500" />
                Archiver et réinitialiser
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-stone-200 text-stone-700 hover:bg-stone-50"
                onClick={handleClearChat}
                disabled={clearChatMutation.isPending}
              >
                <MessageSquareX className="w-4 h-4 mr-2 text-red-500" />
                Nettoyer toutes les messageries
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-stone-200 text-stone-700 hover:bg-stone-50"
                onClick={exportCSV}
              >
                <Download className="w-4 h-4 mr-2 text-blue-500" />
                Exporter les convives (CSV)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tables list */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tables existantes</CardTitle>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <p className="text-sm text-stone-400 italic">Aucune table créée</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tables.map(t => {
                  const tableSeats = allSeats.filter(s => s.table_id === t.id && s.first_name);
                  const maxSeats = getTableCapacity(t);
                  return (
                    <div
                      key={t.id}
                      className={`bg-stone-50 border rounded-xl p-4 text-center group relative ${
                        t.is_presidential ? 'border-amber-300 bg-amber-50/30' : 'border-stone-200'
                      }`}
                    >
                      <p className="text-lg font-semibold text-stone-800">
                        {t.is_presidential ? "★ Table Présidentielle" : `Table ${t.table_number}`}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">{tableSeats.length}/{maxSeats} convives</p>
                      <div className="mt-2 flex flex-col gap-1">
                        <button
                          onClick={() => navigate(createPageUrl("TableView") + `?id=${t.id}`)}
                          className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 mx-auto"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Voir la table
                        </button>
                        <button
                          onClick={() => setCustomizingTable(t)}
                          className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 mx-auto"
                        >
                          <Palette className="w-3 h-3" />
                          Personnaliser
                        </button>
                      </div>
                      {!t.is_presidential && (
                        <button
                          onClick={() => handleDeleteTable(t.id, t.table_number)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {customizingTable && (
        <TableCustomizer
          table={customizingTable}
          onSave={(data) => customizeTableMutation.mutate({ tableId: customizingTable.id, data })}
          onClose={() => setCustomizingTable(null)}
        />
      )}
    </div>
  );
}
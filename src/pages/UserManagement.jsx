import React, { useState } from "react";
import { User } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ConfirmDialog from "../components/admin/ConfirmDialog";

export default function UserManagement() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: "", message: "" });

  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => User.list(),
  });

  // Invite user
  const inviteUserMutation = useMutation({
    mutationFn: async () => {
      await User.create({ email: inviteEmail, role: inviteRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      setInviteEmail("");
      toast.success("Invitation envoyée");
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'invitation");
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success("Utilisateur supprimé");
    },
  });

  const handleDeleteUser = (userId, userEmail) => {
    setConfirmDialog({
      isOpen: true,
      action: () => deleteUserMutation.mutate(userId),
      title: "Supprimer l'utilisateur",
      message: `Vous êtes sur le point de supprimer l'utilisateur ${userEmail}. Cette action est irréversible.`
    });
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to={createPageUrl("AdminControl")}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-stone-800">Gestion des utilisateurs</h1>
            <p className="text-sm text-stone-400">
              Invitez et gérez les utilisateurs de l'application
            </p>
          </div>
        </div>

        {/* Invite User */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Inviter un utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs text-stone-500 mb-1 block">Email</Label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="border-stone-200"
                />
              </div>
              <div>
                <Label className="text-xs text-stone-500 mb-1 block">Rôle</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="border-stone-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => inviteUserMutation.mutate()}
              disabled={!inviteEmail || inviteUserMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Envoyer l'invitation
            </Button>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-stone-600" />
              Utilisateurs ({allUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length === 0 ? (
              <p className="text-sm text-stone-400 italic text-center py-8">Aucun utilisateur</p>
            ) : (
              <div className="space-y-2">
                {allUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{user.full_name || user.email}</p>
                      <p className="text-xs text-stone-500 truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className={`text-xs px-2 py-1 rounded ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-stone-200 text-stone-600'}`}>
                        {user.role}
                      </span>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
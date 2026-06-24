'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Shield,
  Trash2,
  Download,
  Mail,
  UserX,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/illustrations/BadgeStickers'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAdminStore } from '@/stores/adminStore'
import { useAdminUsers } from '@/hooks/useQueries'
import { adminApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import type { User } from '@/types'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { users, updateUser } = useAdminStore()
  const addNotification = useUIStore((s) => s.addNotification)
  const [search, setSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Fetch real users from API
  const { data: usersData, isLoading } = useAdminUsers()
  const displayUsers: User[] = usersData?.users && usersData.users.length > 0
    ? usersData.users
    : users.length > 0
    ? users
    : []

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      addNotification({ type: 'success', title: 'User deleted', message: 'User has been removed' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Delete failed', message: error.message })
    },
  })

  // Suspend/toggle user mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) =>
      adminApi.updateUser(userId, { status, role: 'client' } as User),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      addNotification({ type: 'success', title: 'User updated', message: 'Status changed successfully' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Update failed', message: error.message })
    },
  })

  const filtered = displayUsers.filter((u) => {
    if (!search) return true
    const s = search.toLowerCase()
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.city?.toLowerCase().includes(s)
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selectedUsers)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedUsers(next)
  }

  const openUserDetail = (user: User) => {
    setSelectedUser(user)
    setShowDrawer(true)
  }

  const handleDelete = async (userId: string) => {
    setDeleteTarget(userId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget)
    await deleteMutation.mutateAsync(deleteTarget).catch(() => {})
    setDeletingId(null)
    setDeleteTarget(null)
  }

  const handleSuspendSelected = () => {
    selectedUsers.forEach((userId) => {
      const user = displayUsers.find((u) => u.id === userId)
      if (user) {
        toggleStatusMutation.mutate({
          userId,
          status: user.status === 'suspended' ? 'active' : 'suspended',
        })
      }
    })
    setSelectedUsers(new Set())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${displayUsers.length} total users`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedUsers.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-500"
              onClick={handleSuspendSelected}
              disabled={toggleStatusMutation.isPending}
            >
              <UserX size={14} /> {toggleStatusMutation.isPending ? 'Updating...' : 'Toggle Status'}
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(new Set(filtered.map((u) => u.id)))
                        } else {
                          setSelectedUsers(new Set())
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-3 text-left font-medium text-xs text-muted-foreground uppercase">User</th>
                  <th className="p-3 text-left font-medium text-xs text-muted-foreground uppercase hidden md:table-cell">City</th>
                  <th className="p-3 text-left font-medium text-xs text-muted-foreground uppercase hidden lg:table-cell">Generations</th>
                  <th className="p-3 text-left font-medium text-xs text-muted-foreground uppercase hidden md:table-cell">Joined</th>
                  <th className="p-3 text-left font-medium text-xs text-muted-foreground uppercase">Status</th>
                  <th className="p-3 text-right font-medium text-xs text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors animate-fade-in">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-pk-green-100 flex items-center justify-center text-xs font-medium text-pk-green-700 shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell">{user.city || '-'}</td>
                      <td className="p-3 text-sm hidden lg:table-cell">{user.totalGenerations || 0}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                        {user.createdAt ? formatDate(user.createdAt) : '-'}
                      </td>
                      <td className="p-3">
                        <StatusPill status={user.status || 'active'} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openUserDetail(user)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              toggleStatusMutation.mutate({
                                userId: user.id,
                                status: user.status === 'suspended' ? 'active' : 'suspended',
                              })
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                            title={user.status === 'suspended' ? 'Activate' : 'Suspend'}
                          >
                            <UserX size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={deletingId === user.id}
                            className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Drawer */}
      {showDrawer && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l shadow-xl animate-slide-right">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-bold">User Details</h2>
                <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 5l10 10M15 5l-10 10" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-pk-green-500 flex items-center justify-center text-2xl font-bold text-white">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <StatusPill status={selectedUser.status || 'active'} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">City</span>
                  <span className="font-medium">{selectedUser.city || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">Industry</span>
                  <span className="font-medium">{selectedUser.industry || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">Total Generations</span>
                  <span className="font-medium">{selectedUser.totalGenerations || 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium">{selectedUser.createdAt ? formatDate(selectedUser.createdAt) : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        loading={!!deletingId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  authApi,
  generateApi,
  historyApi,
  documentsApi,
  adminApi,
} from '@/lib/api'
import type { ContentFormData, HistoryFilters } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useGenerateStore } from '@/stores/generateStore'
import { useKBStore } from '@/stores/kbStore'
import { useAdminStore } from '@/stores/adminStore'

// Auth hooks
export function useLogin() {
  const login = useAuthStore((s) => s.login)
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: ({ email, password, role }: { email: string; password: string; role?: 'client' | 'admin' }) =>
      authApi.login(email, password, role || 'client'),
    onSuccess: (data) => {
      login(data.user, data.token)
      addNotification({ type: 'success', title: 'Welcome back!', message: `Logged in as ${data.user.name}` })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Login failed', message: error.message })
    },
  })
}

export function useRegister() {
  const login = useAuthStore((s) => s.login)
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; city?: string; industry?: string }) =>
      authApi.register(data),
    onSuccess: (data) => {
      login(data.user, data.token)
      addNotification({ type: 'success', title: 'Account created!', message: 'Welcome to Pakvoice AI' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Registration failed', message: error.message })
    },
  })
}

// Generate hooks
export function useGenerateContent() {
  const setGeneratedContent = useGenerateStore((s) => s.setGeneratedContent)
  const setIsLoading = useGenerateStore((s) => s.setIsLoading)
  const addToHistory = useGenerateStore((s) => s.addToHistory)
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: (data: ContentFormData) => generateApi.generate(data),
    onMutate: () => {
      setIsLoading(true)
    },
    onSuccess: (data) => {
      setGeneratedContent(data)
      addToHistory(data)
      addNotification({ type: 'success', title: 'Content generated!', message: 'Your content is ready' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Generation failed', message: error.message })
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })
}

export function useRefineContent() {
  const updateGeneratedContent = useGenerateStore((s) => s.updateGeneratedContent)
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: ({ contentId, prompt }: { contentId: string; prompt: string }) =>
      generateApi.refine(contentId, prompt),
    onSuccess: (data) => {
      updateGeneratedContent(data)
      addNotification({ type: 'success', title: 'Content refined!' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Refinement failed', message: error.message })
    },
  })
}

// History hooks
export function useHistory(filters?: HistoryFilters) {
  const setHistory = useGenerateStore((s) => s.setHistory)
  const userId = useAuthStore((s) => s.user?.id)

  return useQuery({
    queryKey: ['history', userId, filters],
    queryFn: async () => {
      const data = await historyApi.list(filters)
      setHistory(data.items)
      return data
    },
    staleTime: 0,           // always fetch fresh data on mount
    refetchOnMount: true,    // override global default
    refetchOnWindowFocus: true,
    enabled: !!userId,
  })
}

export function useDeleteHistory() {
  const queryClient = useQueryClient()
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: (id: string) => historyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      addNotification({ type: 'success', title: 'Deleted', message: 'Content removed from history' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Delete failed', message: error.message })
    },
  })
}

// Documents hooks
export function useDocuments() {
  const setDocuments = useKBStore((s) => s.setDocuments)
  const userId = useAuthStore((s) => s.user?.id)

  return useQuery({
    queryKey: ['documents', userId],
    queryFn: async () => {
      const data = await documentsApi.list()
      setDocuments(data)
      return data
    },
    enabled: !!userId,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()
  const setIsUploading = useKBStore((s) => s.setIsUploading)
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: ({ file, meta }: { file: File; meta: { title: string; category: string; tags: string[] } }) => {
      setIsUploading(true)
      return documentsApi.upload(file, meta)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      addNotification({ type: 'success', title: 'Uploaded!', message: 'Document added to knowledge base' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Upload failed', message: error.message })
    },
    onSettled: () => {
      setIsUploading(false)
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      addNotification({ type: 'success', title: 'Deleted', message: 'Document removed' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Delete failed', message: error.message })
    },
  })
}

// Admin hooks
export function useAdminStats() {
  const setStats = useAdminStore((s) => s.setStats)
  const setIsLoading = useAdminStore((s) => s.setIsLoading)

  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      setIsLoading(true)
      const data = await adminApi.getStats()
      setStats(data)
      setIsLoading(false)
      return data
    },
  })
}

export function useAdminUsers(filters?: Record<string, string>) {
  const setUsers = useAdminStore((s) => s.setUsers)

  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const data = await adminApi.getUsers(filters)
      setUsers(data.users)
      return data
    },
  })
}

export function useAdminContent(filters?: Record<string, string>) {
  const setContentItems = useAdminStore((s) => s.setContentItems)

  return useQuery({
    queryKey: ['admin', 'content', filters],
    queryFn: async () => {
      const data = await adminApi.getContent(filters)
      setContentItems(data.items)
      return data
    },
  })
}

export function useAdminTrends() {
  return useQuery({
    queryKey: ['admin', 'trends'],
    queryFn: () => adminApi.getTrends(),
  })
}

export function useAdminCityStats() {
  const setCityStats = useAdminStore((s) => s.setCityStats)

  return useQuery({
    queryKey: ['admin', 'city-stats'],
    queryFn: async () => {
      const data = await adminApi.getCityStats()
      setCityStats(data as any[])
      return data
    },
  })
}

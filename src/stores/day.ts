import { defineStore } from 'pinia'
import seedTasks from '../data/tasks.json'
import { readLocal, writeLocal } from '../utils/storage'

export interface Task {
  id: string
  title: string
  detail: string
  time: string
  icon: string
  tone: string
}

export const tasks: Task[] = seedTasks

function todayKey(): string {
  const now = new Date()
  return `morning-pages:done:${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

export const useDayStore = defineStore('day', {
  state: () => ({ completed: [] as string[], ready: false }),
  getters: {
    completedCount: (state) => state.completed.length,
    progress: (state) => Math.round((state.completed.length / tasks.length) * 100),
  },
  actions: {
    async hydrate() {
      const saved = await readLocal<string[]>(todayKey())
      this.completed = Array.isArray(saved) ? saved.filter((id) => tasks.some((task) => task.id === id)) : []
      this.ready = true
    },
    async toggle(id: string) {
      if (!tasks.some((task) => task.id === id)) return
      const next = this.completed.includes(id)
        ? this.completed.filter((item) => item !== id)
        : [...this.completed, id]
      await writeLocal(todayKey(), next)
      this.completed = next
    },
  },
})

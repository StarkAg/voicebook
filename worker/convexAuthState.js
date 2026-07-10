import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys'

// Baileys auth state backed by Convex (waSession table) instead of the local
// filesystem, so the WhatsApp login survives Railway redeploys (ephemeral FS)
// without forcing a re-scan. Mirrors the shape of useMultiFileAuthState.
export async function useConvexAuthState(client, api) {
  const rows = await client.query(api.wa.getAllSession, {})
  const cache = new Map(rows.map((r) => [r.key, r.value]))

  const writeData = async (key, value) => {
    const val = JSON.stringify(value, BufferJSON.replacer)
    cache.set(key, val)
    await client.mutation(api.wa.setSessionKey, { key, value: val })
  }
  const readData = (key) => {
    const val = cache.get(key)
    return val ? JSON.parse(val, BufferJSON.reviver) : null
  }
  const removeData = async (key) => {
    cache.delete(key)
    await client.mutation(api.wa.removeSessionKey, { key })
  }

  const creds = readData('creds') || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          for (const id of ids) {
            let value = readData(`${type}-${id}`)
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value)
            }
            data[id] = value
          }
          return data
        },
        set: async (data) => {
          const tasks = []
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id]
              const key = `${category}-${id}`
              tasks.push(value ? writeData(key, value) : removeData(key))
            }
          }
          await Promise.all(tasks)
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
  }
}

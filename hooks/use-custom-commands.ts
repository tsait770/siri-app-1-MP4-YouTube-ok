import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type CommandAction =
  | 'play'
  | 'pause'
  | 'togglePlay'
  | 'seekForward'
  | 'seekBackward'
  | 'volumeUp'
  | 'volumeDown'
  | 'mute';

export interface CustomCommand {
  id: string;
  phrase: string;
  action: CommandAction;
  value?: number;
  createdAt: number;
  updatedAt: number;
}

interface State {
  commands: CustomCommand[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  addCommand: (cmd: Omit<CustomCommand, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCommand: (id: string, patch: Partial<Omit<CustomCommand, 'id' | 'createdAt'>>) => Promise<void>;
  removeCommand: (id: string) => Promise<void>;
  importCommands: (list: CustomCommand[]) => Promise<void>;
  reset: () => Promise<void>;
}

const STORAGE_KEY = '@video_voice/custom_commands_v1';

function sortByUpdated(a: CustomCommand, b: CustomCommand) {
  return b.updatedAt - a.updatedAt;
}

export const [CustomCommandsProvider, useCustomCommands] = createContextHook<State>(() => {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      console.log('[CustomCommands] loading from storage');
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const safe = parsed.filter(Boolean) as CustomCommand[];
            setCommands([...safe].sort(sortByUpdated));
          } else {
            setCommands([]);
          }
        } else {
          setCommands([]);
        }
      } catch (e) {
        console.error('[CustomCommands] load error', e);
        setError('Failed to load custom commands');
        setCommands([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: CustomCommand[]) => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('[CustomCommands] save error', e);
      setError('Failed to save custom commands');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const addCommand = useCallback<State['addCommand']>(async (cmd) => {
    const now = Date.now();
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const next: CustomCommand = { id, createdAt: now, updatedAt: now, phrase: cmd.phrase, action: cmd.action, value: cmd.value };
    setCommands((prev) => {
      const updated = [next, ...prev].sort(sortByUpdated);
      void persist(updated);
      return updated;
    });
  }, [persist]);

  const updateCommand = useCallback<State['updateCommand']>(async (id, patch) => {
    setCommands((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)).sort(sortByUpdated);
      void persist(updated);
      return updated;
    });
  }, [persist]);

  const removeCommand = useCallback<State['removeCommand']>(async (id) => {
    setCommands((prev) => {
      const updated = prev.filter((c) => c.id !== id).sort(sortByUpdated);
      void persist(updated);
      return updated;
    });
  }, [persist]);

  const importCommands = useCallback<State['importCommands']>(async (list) => {
    const normalized = list.map((c) => ({
      ...c,
      id: c.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: c.createdAt ?? Date.now(),
      updatedAt: c.updatedAt ?? Date.now(),
    }));
    const merged = [...normalized].sort(sortByUpdated);
    setCommands(merged);
    await persist(merged);
  }, [persist]);

  const reset = useCallback<State['reset']>(async () => {
    setCommands([]);
    await persist([]);
  }, [persist]);

  const value: State = useMemo(() => ({
    commands,
    isLoading,
    isSaving,
    error,
    addCommand,
    updateCommand,
    removeCommand,
    importCommands,
    reset,
  }), [commands, isLoading, isSaving, error, addCommand, updateCommand, removeCommand, importCommands, reset]);

  return value;
});

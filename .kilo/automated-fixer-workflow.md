# Automated Fixer Workflow

## Trigger
```yaml
when: any_agent_reports_bug
action: spawn_fixer
```

## Bug → Fixer mapping
| Severidad | Fixer | ¿Bloquea? |
|-----------|-------|-----------|
| critical | agent_manager spawn inmediato | Sí, pausa usuario |
| medium | agent_manager spawn inmediato | Solo si bloquea |
| low | agent_manager spawn inmediato | No, usuario sigue |

## Fixer template
Cada fixer recibe:
- Branch: `fix/{bug-slug}-{n}`
- Model: `deepseek/deepseek-v4-pro`
- Prompt: descripción exacta del bug + archivo + fix esperado
- Comando final: commit con mensaje descriptivo

## Flujo completo
```
Agente usuario → encuentra bug → reporta
                                   ↓
Yo (coordinator) → agent_manager spawn fixer con worktree
                                   ↓
Fixer → investiga → implementa → lint → typecheck → commit
                                   ↓
Yo → git merge fixer-branch → main
                                   ↓
Si DB afectada → npm run db:reset → reiniciar usuarios
Si no → usuario reinicia desde paso afectado
```

## Batch current state
- Batch 1: 9/9 usuarios completados (5 bugs resueltos)
- Batch 2: 5 usuarios corriendo (diego, laura, sofia, ricardo, roberto)

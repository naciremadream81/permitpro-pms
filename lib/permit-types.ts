import { DEFAULT_PERMIT_TYPES } from '@/lib/counties-seed-data'

type PermitTypeDefinitionRow = {
  code: string
  label: string
  order: number
}

type PermitTypeDefinitionClient = {
  permitTypeDefinition: {
    findMany: (args: { orderBy: Array<{ order: 'asc' } | { label: 'asc' }> }) => Promise<PermitTypeDefinitionRow[]>
    upsert: (args: {
      where: { code: string }
      update: Record<string, never>
      create: {
        code: string
        label: string
        description: string
        isBuiltIn: true
        order: number
        createdBy: string
      }
    }) => Promise<unknown>
  }
}

const permitTypeOrderBy = [{ order: 'asc' }, { label: 'asc' }] as Array<{ order: 'asc' } | { label: 'asc' }>

export async function ensureDefaultPermitTypes(db: PermitTypeDefinitionClient, createdBy: string) {
  const existingTypes = await db.permitTypeDefinition.findMany({ orderBy: permitTypeOrderBy })
  const existingCodes = new Set(existingTypes.map(type => type.code))
  const missingDefaultTypes = DEFAULT_PERMIT_TYPES.filter(type => !existingCodes.has(type.code))

  if (missingDefaultTypes.length === 0) {
    return existingTypes
  }

  for (const permitType of missingDefaultTypes) {
    await db.permitTypeDefinition.upsert({
      where: { code: permitType.code },
      update: {},
      create: {
        code: permitType.code,
        label: permitType.label,
        description: permitType.description,
        isBuiltIn: true,
        order: permitType.order,
        createdBy,
      },
    })
  }

  return db.permitTypeDefinition.findMany({ orderBy: permitTypeOrderBy })
}

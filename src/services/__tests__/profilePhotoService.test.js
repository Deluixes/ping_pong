import { vi, describe, it, expect, beforeEach } from 'vitest'

// ==================== MOCK SUPABASE ====================

let mockResponses = {}
let mockStorageListResult = { data: [], error: null }
let mockStorageUploadResult = { error: null }
let mockStorageRemoveResult = { error: null }
let mockStoragePublicUrl = 'http://test.com/photo.jpg'

function createChain(tableName) {
    const chain = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        upsert: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        neq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        then: (resolve) => resolve(mockResponses[tableName] || { data: null, error: null }),
    }
    return chain
}

const mockFrom = vi.fn((tableName) => createChain(tableName))

const mockStorageList = vi.fn(() => Promise.resolve(mockStorageListResult))
const mockStorageUpload = vi.fn(() => Promise.resolve(mockStorageUploadResult))
const mockStorageRemove = vi.fn(() => Promise.resolve(mockStorageRemoveResult))
const mockStorageGetPublicUrl = vi.fn(() => ({
    data: { publicUrl: mockStoragePublicUrl },
}))

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
        storage: {
            from: vi.fn(() => ({
                list: (...args) => mockStorageList(...args),
                upload: (...args) => mockStorageUpload(...args),
                remove: (...args) => mockStorageRemove(...args),
                getPublicUrl: (...args) => mockStorageGetPublicUrl(...args),
            })),
        },
    },
}))

import { profilePhotoService } from '../profilePhotoService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
    mockStorageList.mockClear()
    mockStorageUpload.mockClear()
    mockStorageRemove.mockClear()
    mockStorageGetPublicUrl.mockClear()
    mockStorageListResult = { data: [], error: null }
    mockStorageUploadResult = { error: null }
    mockStorageRemoveResult = { error: null }
    mockStoragePublicUrl = 'http://test.com/photo.jpg'
})

// ==================== uploadProfilePhoto ====================

describe('uploadProfilePhoto', () => {
    const file = { name: 'avatar.png' }

    it("upload le fichier et retourne l'URL avec timestamp", async () => {
        mockResponses['members'] = { data: null, error: null }

        const result = await profilePhotoService.uploadProfilePhoto('u1', file)
        expect(result.success).toBe(true)
        expect(result.url).toMatch(/^http:\/\/test\.com\/photo\.jpg\?t=\d+$/)
    })

    it("supprime les anciens fichiers avant l'upload", async () => {
        mockStorageListResult = { data: [{ name: 'old.jpg' }], error: null }
        mockResponses['members'] = { data: null, error: null }

        await profilePhotoService.uploadProfilePhoto('u1', file)
        expect(mockStorageRemove).toHaveBeenCalledWith(['u1/old.jpg'])
    })

    it("retourne failure si l'upload échoue", async () => {
        mockStorageUploadResult = { error: { message: 'upload fail' } }

        const result = await profilePhotoService.uploadProfilePhoto('u1', file)
        expect(result).toEqual({ success: false, error: 'upload fail' })
    })

    it('retourne failure si la mise à jour du profil échoue', async () => {
        mockResponses['members'] = { data: null, error: { message: 'update fail' } }

        const result = await profilePhotoService.uploadProfilePhoto('u1', file)
        expect(result).toEqual({ success: false, error: 'update fail' })
    })
})

// ==================== deleteProfilePhoto ====================

describe('deleteProfilePhoto', () => {
    it("supprime les fichiers et met l'URL à null", async () => {
        mockStorageListResult = { data: [{ name: 'avatar.png' }], error: null }
        mockResponses['members'] = { data: null, error: null }

        const result = await profilePhotoService.deleteProfilePhoto('u1')
        expect(result).toEqual({ success: true })
        expect(mockStorageRemove).toHaveBeenCalledWith(['u1/avatar.png'])
    })

    it("retourne success même s'il n'y a pas de fichiers", async () => {
        mockStorageListResult = { data: [], error: null }
        mockResponses['members'] = { data: null, error: null }

        const result = await profilePhotoService.deleteProfilePhoto('u1')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure si la mise à jour du profil échoue', async () => {
        mockStorageListResult = { data: [], error: null }
        mockResponses['members'] = { data: null, error: { message: 'update fail' } }

        const result = await profilePhotoService.deleteProfilePhoto('u1')
        expect(result).toEqual({ success: false, error: 'update fail' })
    })
})

// ==================== getProfilePhotoUrl ====================

describe('getProfilePhotoUrl', () => {
    it("retourne l'URL de la photo", async () => {
        mockResponses['members'] = {
            data: { profile_photo_url: 'http://photo.jpg' },
            error: null,
        }

        const result = await profilePhotoService.getProfilePhotoUrl('u1')
        expect(result).toBe('http://photo.jpg')
    })

    it('retourne null sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await profilePhotoService.getProfilePhotoUrl('u1')
        expect(result).toBeNull()
    })
})

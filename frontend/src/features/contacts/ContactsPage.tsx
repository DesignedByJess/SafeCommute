import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretLeft, Plus, CaretRight, Trash } from '@phosphor-icons/react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { OtpVerifyModal } from './OtpVerifyModal'
import { api } from '../../services/api'
import { maskPhone } from '../../utils/format'
import { sanitize } from '../../utils/sanitize'
interface Contact {
  id: string
  name: string
  phone_number_encrypted: string
  relationship: string | null
  verified: boolean
  created_at: string
}

const RELATIONSHIPS = ['Sister', 'Brother', 'Parent', 'Spouse', 'Friend', 'Other']

function InitialsAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-[#0891B2]">{initial}</span>
    </div>
  )
}

export default function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)

  const [otpContactId, setOtpContactId] = useState('')
  const [otpContactName, setOtpContactName] = useState('')
  const [otpDevOtp, setOtpDevOtp] = useState<string | undefined>()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('')

  const [formError, setFormError] = useState('')

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get('/contacts')
      setContacts(res.data.data)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const resetForm = () => {
    setName('')
    setPhone('')
    setRelationship('')
  }

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('234')) return '+' + digits
    if (digits.startsWith('0')) return '+234' + digits.slice(1)
    return '+' + digits
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const contactName = name
    try {
      const res = await api.post('/contacts', { name, phone: formatPhone(phone), relationship: relationship || undefined })
      resetForm()
      setShowAddModal(false)
      const newContact = res.data.data
      if (newContact?.id) {
        setOtpContactId(newContact.id)
        setOtpContactName(contactName)
        setOtpDevOtp(newContact.devOtp)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setFormError(axiosErr?.response?.data?.error || 'Could not save contact')
    }
  }

  const openEdit = (contact: Contact) => {
    setEditingContact(contact)
    setName(contact.name)
    setPhone(contact.phone_number_encrypted)
    setRelationship(contact.relationship || '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContact) return
    const contactName = name
    try {
      const res = await api.put(`/contacts/${editingContact.id}`, { name, phone, relationship: relationship || undefined })
      setEditingContact(null)
      resetForm()
      fetchContacts()
      const updated = res.data.data
      if (updated?.phoneChanged && updated?.id) {
        setOtpContactId(updated.id)
        setOtpContactName(contactName)
        setOtpDevOtp(updated.devOtp)
      }
    } catch {
      /* handle error */
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/contacts/${deleteTarget.id}`)
      setDeleteTarget(null)
      setEditingContact(null)
      fetchContacts()
    } catch {
      /* ignore */
    }
  }

  const handleOtpSuccess = () => {
    setOtpContactId('')
    setOtpContactName('')
    setOtpDevOtp(undefined)
    fetchContacts()
  }

  const handleOtpClose = () => {
    setOtpContactId('')
    setOtpContactName('')
    setOtpDevOtp(undefined)
  }

  return (
    <>
    <div className="h-dvh bg-[#FAFAFA] flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 pt-14 pb-4">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => navigate(-1)}
              className="absolute left-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#0F172A]"
              aria-label="Back"
            >
              <CaretLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-[#0F172A]">Trusted Contacts</h1>
          </div>
        </div>

        <div className="px-6">
          {contacts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-500">No contacts yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {contacts.map((contact, i) => {
                const isLast = i === contacts.length - 1
                return (
                  <button
                    key={contact.id}
                    onClick={() => openEdit(contact)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 min-h-[52px] text-left transition-colors hover:bg-gray-50 ${!isLast ? 'border-b border-gray-100' : ''}`}
                  >
                    <InitialsAvatar name={contact.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{sanitize(contact.name)}</p>
                      <p className="text-sm text-gray-500">{maskPhone(contact.phone_number_encrypted)}</p>
                    </div>
                    <CaretRight className="w-5 h-5 text-gray-400 shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 bg-[#FAFAFA] px-6 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={() => { resetForm(); setShowAddModal(true) }} className="w-full bg-[#0891B2] text-white font-medium rounded-lg px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center justify-center cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Add new contact
        </button>
      </div>
    </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Contact">
        <form onSubmit={handleAdd} className="space-y-4">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" required />
          <div>
            <label htmlFor="add-relationship" className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
            <select
              id="add-relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 pr-10 py-2.5 text-sm bg-gray-100 transition-colors focus:outline-none focus:ring-0 focus:border-[#0891B2] focus:bg-white min-h-[44px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
            >
              <option value="" disabled>Select relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">Add Contact</Button>
        </form>
      </Modal>

      <Modal
        open={editingContact !== null}
        onClose={() => { setEditingContact(null); resetForm() }}
        title="Edit Contact"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" required />
          <div>
            <label htmlFor="edit-relationship" className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
            <select
              id="edit-relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 pr-10 py-2.5 text-sm bg-gray-100 transition-colors focus:outline-none focus:ring-0 focus:border-[#0891B2] focus:bg-white min-h-[44px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
            >
              <option value="" disabled>Select relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">Save Changes</Button>
          <button
            type="button"
            onClick={() => editingContact && setDeleteTarget(editingContact)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-500 hover:text-[#DC2626] transition-colors min-h-[44px]"
          >
            <Trash className="w-4 h-4" />
            Delete Contact
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Contact"
        message={`Are you sure you want to remove ${sanitize(deleteTarget?.name || 'this contact')}? They will no longer receive your trip updates.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <OtpVerifyModal
        key={otpContactId}
        open={otpContactId !== ''}
        contactId={otpContactId}
        contactName={otpContactName}
        devOtp={otpDevOtp}
        onClose={handleOtpClose}
        onSuccess={handleOtpSuccess}
      />
    </>
  )
}

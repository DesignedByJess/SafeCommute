import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Check, Phone } from 'lucide-react'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
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

export default function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('')

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post('/contacts', { name, phone, relationship: relationship || undefined })
      setShowAddModal(false)
      setName('')
      setPhone('')
      setRelationship('')
      const newContact = res.data.data
      if (newContact?.id) {
        navigate(`/contacts/${newContact.id}/verify-otp`, {
          state: { devOtp: newContact.devOtp },
        })
      }
    } catch {
      /* handle error */
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`)
      fetchContacts()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trusted Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">People notified when you start a trip</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Phone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No contacts yet. Add your first trusted contact.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{sanitize(contact.name)}</p>
                  {contact.verified && <Check className="w-4 h-4 text-green-600" />}
                </div>
                <p className="text-sm text-gray-500">{maskPhone(contact.phone_number_encrypted)}</p>
                {contact.relationship && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {sanitize(contact.relationship)}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(contact.id)}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Contact">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" required />
          <Input label="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. spouse, parent" />
          <Button type="submit" className="w-full">Add Contact</Button>
        </form>
      </Modal>
    </div>
  )
}

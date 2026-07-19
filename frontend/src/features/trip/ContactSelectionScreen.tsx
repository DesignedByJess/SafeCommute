import { useEffect, useState, useCallback } from 'react'
import { CaretLeft, Plus, ArrowRight, X } from '@phosphor-icons/react'
import { StepProgress } from '../../components/StepProgress'
import { api } from '../../services/api'
import { ScreenWithBottomAction } from '../../components/ScreenWithBottomAction'
import { OtpVerifyModal } from '../../features/contacts/OtpVerifyModal'

interface Contact {
 id: string
 name: string
 phone_number_encrypted: string
 relationship: string | null
 verified: boolean
 created_at: string
}

interface ContactSelectionScreenProps {
 onBack: () => void
 onContinue: (contactId: string, contactName: string, contactPhone: string) => void
}

function getInitials(name: string): string {
 return name
  .split(' ')
  .map((part) => part[0])
  .filter(Boolean)
  .slice(0, 2)
  .join('')
  .toUpperCase()
}

export function ContactSelectionScreen({ onBack, onContinue }: ContactSelectionScreenProps) {
 const [contacts, setContacts] = useState<Contact[]>([])
 const [selectedId, setSelectedId] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)

 // Add contact modal state
 const [showAddModal, setShowAddModal] = useState(false)
 const [addName, setAddName] = useState('')
 const [addPhone, setAddPhone] = useState('')
 const [addRelationship, setAddRelationship] = useState('')
 const [addLoading, setAddLoading] = useState(false)
 const [addError, setAddError] = useState('')

 // OTP verification state
 const [otpContactId, setOtpContactId] = useState('')
 const [otpContactName, setOtpContactName] = useState('')
 const [otpDevOtp, setOtpDevOtp] = useState<string | undefined>(undefined)

 const fetchContacts = useCallback(async () => {
  try {
   const res = await api.get('/contacts')
   const all: Contact[] = res.data?.data ?? []
   setContacts(all)
  } catch {
   setContacts([])
  }
 }, [])

 useEffect(() => {
  fetchContacts().finally(() => setLoading(false))
 }, [fetchContacts])

 const selected = contacts.find((c) => c.id === selectedId)

 const handleContinue = () => {
  if (selected) {
   onContinue(selected.id, selected.name, selected.phone_number_encrypted)
  }
 }

 const avatarColor = (): string => {
  return 'bg-[#E0F2FE]'
 }

 const handleAddContact = async (e: React.FormEvent) => {
  e.preventDefault()
  setAddError('')

  if (!addName.trim() || !addPhone.trim()) {
   setAddError('Name and phone are required')
   return
  }

  setAddLoading(true)
  try {
   const res = await api.post('/contacts', {
    name: addName.trim(),
    phone: addPhone.trim(),
    relationship: addRelationship.trim() || undefined,
   })

   const newContact = res.data?.data
   setShowAddModal(false)
   setAddName('')
   setAddPhone('')
   setAddRelationship('')

   // Open OTP verification modal
   setOtpContactId(newContact.id)
   setOtpContactName(newContact.name)
   setOtpDevOtp(newContact.devOtp)
  } catch (err: unknown) {
   const axiosErr = err as { response?: { data?: { error?: string } } }
   setAddError(axiosErr?.response?.data?.error || 'Failed to add contact')
  } finally {
   setAddLoading(false)
  }
 }

 const handleOtpSuccess = async () => {
  setOtpContactId('')
  setOtpContactName('')
  setOtpDevOtp(undefined)

  // Re-fetch contacts and auto-select the newly added one
  await fetchContacts()

  // The new contact is the most recently added one — find it by matching the OTP contact name
  // Since we just re-fetched, look for the contact that matches
  try {
   const res = await api.get('/contacts')
   const all: Contact[] = res.data?.data ?? []
   const newContact = all.find((c) => c.name === otpContactName && c.verified)
   if (newContact) {
    setSelectedId(newContact.id)
   }
  } catch {
   // fallback: list was already updated by fetchContacts
  }
 }

 const handleOtpClose = () => {
  setOtpContactId('')
  setOtpContactName('')
  setOtpDevOtp(undefined)
 }

 const resetAddForm = () => {
  setShowAddModal(false)
  setAddName('')
  setAddPhone('')
  setAddRelationship('')
  setAddError('')
 }

 return (
  <>
   <ScreenWithBottomAction
    hideBorder
    actions={
     <div>
      <button
       type="button"
       onClick={handleContinue}
       disabled={!selected}
       className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-4 min-h-[56px] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#0891B2] flex items-center justify-center gap-2"
      >
       Continue
       <ArrowRight className="w-5 h-5" />
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">
       Free tier: 1 contact per trip
      </p>
     </div>
    }
   >
    {/* Header */}
   <div className="px-6 pt-14 pb-4">
     <div className="flex items-center mb-2">
      <button
       type="button"
       onClick={onBack}
       className="min-h-[32px] min-w-[32px] flex items-center justify-center -ml-2 focus:outline-none focus:ring-1 focus:ring-[#0891B2] rounded-lg"
       aria-label="Go back"
      >
       <CaretLeft className="w-6 h-6 text-[#0F172A]" />
      </button>
      <h1 className="flex-1 text-center mr-8 text-[24px] font-bold text-[#0F172A]">Who should we notify?</h1>
     </div>
     <p className="text-sm text-gray-500 mt-0.5 text-center">They'll receive your live trip details for safety</p>
    </div>

   {/* Step progress */}
   <div className="px-6">
    <StepProgress currentStep={2} totalSteps={5} />
   </div>

   {/* Contact list */}
   <div className="px-6 pb-2 overflow-y-auto">
    {loading ? (
     <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
     </div>
    ) : contacts.length === 0 ? (
     <div className="text-center py-12">
      <p className="text-gray-500 mb-2">No verified contacts yet</p>
      <p className="text-xs text-gray-400">Add a trusted contact to get started</p>
     </div>
    ) : (
     <div className="space-y-3">
      {contacts.map((contact) => {
       const isSelected = contact.id === selectedId
       return (
        <button
         key={contact.id}
         type="button"
         onClick={() => setSelectedId(contact.id)}
         className={`w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 text-left min-h-[44px] transition-all ${
          isSelected
           ? 'border border-[#0891B2]'
           : 'border border-[#F3EFEF]'
         }`}
        >
         {/* Avatar with initials */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${avatarColor()}`}>
           <span className="text-sm font-bold text-[#0891B2]">{getInitials(contact.name)}</span>
          </div>

         {/* Name and phone */}
         <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
           <p className="text-sm font-bold text-[#0F172A]">{contact.name}</p>
           {!contact.verified && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Pending</span>
           )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{contact.phone_number_encrypted}</p>
         </div>

         {/* Radio indicator */}
         <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          isSelected ? 'border-[#0891B2]' : 'border-gray-400'
         }`}>
          {isSelected && <div className="w-3 h-3 rounded-full bg-[#0891B2]" />}
         </div>
        </button>
       )
      })}
     </div>
    )}

    {/* Add new contact button */}
    <button
     type="button"
     onClick={() => setShowAddModal(true)}
     className="w-full flex items-center justify-center gap-2 py-4 mt-3 text-sm font-medium text-[#0891B2] min-h-[44px]"
    >
     <Plus className="w-4 h-4" />
     Add new contact
    </button>
   </div>
   </ScreenWithBottomAction>

   {/* Add Contact Modal */}
   {showAddModal && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
     <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
      <button
       onClick={resetAddForm}
       className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600"
       aria-label="Close"
      >
       <X className="w-5 h-5" />
      </button>

      <div className="text-center mb-6">
       <h2 className="text-lg font-semibold text-gray-900">Add Contact</h2>
       <p className="text-sm text-gray-500 mt-1">
        Add a trusted contact to track your trip
       </p>
      </div>

      {addError && (
       <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
        {addError}
       </div>
      )}

      <form onSubmit={handleAddContact} className="space-y-4">
       <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
         type="text"
         value={addName}
         onChange={(e) => setAddName(e.target.value)}
         placeholder="Contact name"
         className="block w-full px-3 py-2.5 text-sm bg-gray-100 rounded-lg border border-gray-300 transition-colors placeholder:text-gray-400 focus:bg-white focus:border-[#0891B2] focus:outline-none min-h-[44px]"
        />
       </div>
       <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
         type="tel"
         value={addPhone}
         onChange={(e) => setAddPhone(e.target.value)}
         placeholder="+234..."
         className="block w-full px-3 py-2.5 text-sm bg-gray-100 rounded-lg border border-gray-300 transition-colors placeholder:text-gray-400 focus:bg-white focus:border-[#0891B2] focus:outline-none min-h-[44px]"
        />
       </div>
       <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
        <select
         value={addRelationship}
         onChange={(e) => setAddRelationship(e.target.value)}
         className="block w-full px-3 py-2.5 text-sm bg-gray-100 rounded-lg border border-gray-300 transition-colors focus:bg-white focus:border-[#0891B2] focus:outline-none min-h-[44px]"
        >
         <option value="">Select relationship</option>
         <option value="spouse">Spouse</option>
         <option value="parent">Parent</option>
         <option value="sibling">Sibling</option>
         <option value="friend">Friend</option>
         <option value="colleague">Colleague</option>
         <option value="other">Other</option>
        </select>
       </div>

       <button
        type="submit"
        disabled={addLoading}
        className="w-full bg-[#0891B2] text-white font-bold text-base rounded-2xl py-3 min-h-[52px] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
       >
        {addLoading ? 'Adding...' : 'Add Contact'}
       </button>
      </form>
     </div>
    </div>
   )}

   {/* OTP Verification Modal */}
   <OtpVerifyModal
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

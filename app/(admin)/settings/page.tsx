/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const [defaultStatus, setDefaultStatus] = useState<'HADIR' | 'IZIN' | 'SAKIT' | 'DL' | 'TK'>('HADIR')
  const [notesTemplate, setNotesTemplate] = useState('')
  const [password, setPassword] = useState('')

  function handleSave() {
    alert('Pengaturan tersimpan (dummy).')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pengaturan</h1>
        <p className="text-sm text-slate-500">Atur status default, catatan, dan password.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Status Kehadiran Default</Label>
            <Select value={defaultStatus} onValueChange={(v: any) => setDefaultStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HADIR">Hadir</SelectItem>
                <SelectItem value="IZIN">Izin</SelectItem>
                <SelectItem value="SAKIT">Sakit</SelectItem>
                <SelectItem value="DL">DL</SelectItem>
                <SelectItem value="TK">TK</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Template Catatan</Label>
            <Textarea placeholder="Contoh: Hadir rapat koordinasi ..." value={notesTemplate} onChange={(e) => setNotesTemplate(e.target.value)} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Ganti Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password baru" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline">Batal</Button>
        <Button className="bg-[#003A70] hover:opacity-95" onClick={handleSave}><Save className="h-4 w-4 mr-1"/> Simpan</Button>
      </div>
    </div>
  )
}

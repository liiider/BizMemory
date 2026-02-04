import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition, Combobox } from '@headlessui/react'
import { X, Upload, User, Check, ChevronsUpDown } from 'lucide-react'
import { supabase } from '../store/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import clsx from 'clsx'
import dayjs from 'dayjs'

export default function UploadModal() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [statusText, setStatusText] = useState('正在处理...')

    useEffect(() => {
        const handleOpen = () => setIsOpen(true)
        document.addEventListener('open-upload-modal', handleOpen)
        return () => document.removeEventListener('open-upload-modal', handleOpen)
    }, [])

    const handleFileChange = (e) => {
        const selected = e.target.files[0]
        if (selected) {
            setFile(selected)
            setPreview(URL.createObjectURL(selected))
        }
    }

    const handleUpload = async () => {
        if (!file || !user) return
        setUploading(true)
        setStatusText('正在上传图片...')

        try {
            // 1. Upload Image to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('biz_images')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('biz_images')
                .getPublicUrl(fileName)

            // 2. Trigger Dify Analysis FIRST
            setStatusText('正在分析...')

            const { analyzeImage } = await import('../services/dify')
            const analysis = await analyzeImage(publicUrl, user.id)
            console.log('Analysis Result:', analysis)

            // 3. Determine Person Name from Analysis
            // Logic: Try to parse JSON output. 
            let analysisData = {};
            let personName = "Unknown";
            let summaryText = "";

            // Helper: Robust JSON Extractor
            const extractJSON = (str) => {
                if (!str) return null;
                try {
                    // Try to clean potential markdown json blocks
                    const cleanStr = str.replace(/```json\n?|\n?```/g, '').trim();

                    const firstOpen = cleanStr.indexOf('{');
                    const lastClose = cleanStr.lastIndexOf('}');

                    if (firstOpen !== -1 && lastClose !== -1 && lastClose >= firstOpen) {
                        return JSON.parse(cleanStr.substring(firstOpen, lastClose + 1));
                    }
                } catch (e) {
                    console.warn("JSON extraction failed", e);
                }
                return null;
            }

            const rawAnalysis = typeof analysis.analysis === 'string' ? analysis.analysis : JSON.stringify(analysis.analysis);
            const parsed = extractJSON(rawAnalysis);

            // Try to find a name from common fields returned by various prompt versions
            const extractedName = parsed?.name || parsed?.person || parsed?.contact_name || parsed?.who;

            if (parsed && extractedName && extractedName !== '{') {
                analysisData = parsed;
                personName = extractedName;
                summaryText = parsed.summary || parsed.content || parsed.description || rawAnalysis;
            } else {
                // Fallback: Parsing failed or name missing
                console.warn("Analysis parsing failed or name missing, using simple heuristic");

                // Avoid using "{" as name by checking first char
                const lines = rawAnalysis.split('\n').filter(l => l.trim().length > 0);
                let firstValidLine = lines.find(l => !l.trim().startsWith('{') && !l.trim().startsWith('`'));

                if (firstValidLine) {
                    personName = firstValidLine.substring(0, 20).trim();
                } else {
                    personName = "New Contact " + dayjs().format('MM-DD');
                }
                summaryText = rawAnalysis;
                analysisData = { raw: rawAnalysis };
            }

            // Final sanity check
            if (!personName || personName.startsWith('{') || personName === 'Unknown') {
                personName = "Person " + dayjs().format('MM-DD HH:mm');
            }


            setStatusText(`正在保存到 "${personName}"...`)

            // 4. Find or Create Contact
            let contactId = null;

            // Check existence (Exact match user-scoped)
            const { data: existingContacts } = await supabase
                .from('contacts')
                .select('id')
                .eq('name', personName)
                .limit(1)

            if (existingContacts && existingContacts.length > 0) {
                contactId = existingContacts[0].id
            } else {
                // Create New Contact
                const { data: newContact, error: createError } = await supabase
                    .from('contacts')
                    .insert([{
                        user_id: user.id,
                        name: personName,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(personName)}&background=eef2ff&color=4f46e5&bold=true&length=1`
                    }])
                    .select()
                    .single()

                if (createError) throw createError
                contactId = newContact.id
            }

            // 5. Create Record
            const { error: recordError } = await supabase
                .from('records')
                .insert([{
                    user_id: user.id,
                    contact_id: contactId,
                    image_url: publicUrl,
                    analysis_result: analysisData, // Store parsed JSON object
                    key_takeaways: summaryText // Store the summary text
                }])

            if (recordError) throw recordError

            // Update Contact Timestamp & Summary
            await supabase.from('contacts').update({
                last_updated: new Date(),
                summary: summaryText
            }).eq('id', contactId)

            // Close & Reset
            setIsOpen(false)
            setFile(null)
            setPreview(null)
            document.dispatchEvent(new CustomEvent('refresh-home'))

        } catch (err) {
            console.error('Upload failed:', err)
            alert('Upload failed: ' + err.message)
        } finally {
            setUploading(false)
            setStatusText('正在处理...')
        }
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto w-screen p-4 sm:p-6 md:p-20">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="mx-auto max-w-xl transform rounded-2xl bg-white p-6 shadow-2xl transition-all">
                            <div className="flex items-center justify-between mb-6">
                                <Dialog.Title className="text-lg font-semibold text-slate-900">
                                    上传记录
                                </Dialog.Title>
                                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Image Dropzone */}
                                <div
                                    className={clsx(
                                        "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                                        file ? "border-primary-200 bg-primary-50" : "border-slate-300 hover:border-primary-400 hover:bg-slate-50"
                                    )}
                                    // Make sure disabled if uploading
                                    onClick={() => !uploading && document.getElementById('file-upload').click()}
                                >
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-contain shadow-sm" />
                                    ) : (
                                        <>
                                            <div className="p-3 bg-primary-100 text-primary-600 rounded-full mb-3">
                                                <Upload size={24} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900">点击上传图片</p>
                                            <p className="text-xs text-slate-500 mt-1">支持微信截图、文档图片等</p>
                                        </>
                                    )}
                                    <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                                </div>

                                {/* Guidance Text */}
                                <div className="text-xs text-slate-400 text-center italic">
                                    * AI 将自动分析内容并按联系人分类整理
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="button"
                                        className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                        onClick={() => setIsOpen(false)}
                                        disabled={uploading}
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!file || uploading}
                                        className="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleUpload}
                                    >
                                        {uploading ? statusText : '开始分析'}
                                    </button>
                                </div>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}

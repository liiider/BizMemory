import { useState, useEffect } from 'react'
import { Search, Plus, Clock, Tag } from 'lucide-react'
import { supabase } from '../store/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function Home() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [people, setPeople] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchPeople = async () => {
        if (!user) return
        setLoading(true)
        const { data, error } = await supabase
            .from('contacts')
            .select(`
                *,
                records(analysis_result, created_at)
            `)
            .order('last_updated', { ascending: false })

        if (error) console.error(error)
        else {
            // Sort records locally to ensure the first one is the latest if DB ordering is tricky
            const processed = (data || []).map(p => ({
                ...p,
                latest_record: p.records?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
            }))
            setPeople(processed)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchPeople()

        // Listen for refresh event from UploadModal
        const handleRefresh = () => fetchPeople()
        document.addEventListener('refresh-home', handleRefresh)
        return () => document.removeEventListener('refresh-home', handleRefresh)
    }, [user])


    const filteredPeople = people.filter(p => {
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(term);
        const summaryMatch = p.summary && p.summary.toLowerCase().includes(term);

        // Check keywords in latest record (hidden but searchable)
        const latestResult = p.latest_record?.analysis_result;
        let keywordsMatch = false;
        if (latestResult) {
            // Handle both object and string scenarios
            const kw = latestResult.keywords;
            if (typeof kw === 'string') {
                keywordsMatch = kw.toLowerCase().includes(term);
            } else if (kw) {
                keywordsMatch = JSON.stringify(kw).toLowerCase().includes(term);
            }
        }

        return nameMatch || summaryMatch || keywordsMatch;
    })

    return (
        <div className="space-y-6">
            {/* Header & Search */}
            <div className="sticky top-0 bg-slate-50 pt-2 pb-4 z-10">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            className="block w-full rounded-full border-0 py-3 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                            placeholder="搜索联系人..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => document.dispatchEvent(new CustomEvent('open-upload-modal'))}
                        className="flex-shrink-0 inline-flex items-center justify-center rounded-full bg-primary-600 p-3 text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                        <Plus className="h-6 w-6" aria-hidden="true" />
                    </button>

                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">正在加载联系人...</div>
            ) : filteredPeople.length === 0 ? (
                <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 text-slate-300">
                        <Search className="h-full w-full" />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">未找到联系人</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        {searchTerm ? '尝试换个关键词搜索' : '上传第一张照片开始记录'}
                    </p>
                    {!searchTerm && (
                        <div className="mt-6">
                            <button
                                onClick={() => document.dispatchEvent(new CustomEvent('open-upload-modal'))}
                                className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                            >
                                <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                上传记录
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPeople.map((person) => {
                        const latest = person.latest_record;
                        const result = latest?.analysis_result;

                        // Parse 'tag' for display (fallback to keywords if tag missing, but prefer tag)
                        let displayTags = [];
                        if (result?.tag) {
                            displayTags = result.tag.split(/[ ,，]+/).filter(k => k.length > 0);
                        } else if (result?.keywords) {
                            // Fallback to keywords if no clean tags
                            displayTags = result.keywords.split(/[ ,，]+/).filter(k => k.length > 0).slice(0, 3);
                        }

                        // Consistent Branded Avatar
                        // Use on-the-fly URL construction to ensure branding matches
                        const brandedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=eef2ff&color=4f46e5&bold=true&length=1`;

                        return (
                            <div
                                key={person.id}
                                className="relative flex items-start space-x-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm hover:border-primary-300 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group"
                                onClick={() => navigate(`/person/${person.id}`)}
                            >
                                <div className="flex-shrink-0">
                                    <img
                                        className="h-12 w-12 rounded-full ring-2 ring-white shadow-sm object-cover bg-primary-50"
                                        src={brandedAvatar}
                                        alt={person.name}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            // Fallback to simple initial if load fails
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}`
                                        }}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-base font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                                            {person.name}
                                        </p>
                                        <div className="flex items-center text-[11px] text-slate-400 font-medium">
                                            <Clock className="w-3.5 h-3.5 mr-1" />
                                            {dayjs(person.last_updated).fromNow()}
                                        </div>
                                    </div>

                                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 leading-snug">
                                        {person.summary || '暂无最近活动。'}
                                    </p>

                                    {/* Labels / Tags */}
                                    <div className="mt-4 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
                                        {displayTags.slice(0, 4).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 whitespace-nowrap group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {displayTags.length > 4 && (
                                            <span className="text-[10px] text-slate-400 font-medium pt-1 px-1">
                                                +{displayTags.length - 4}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

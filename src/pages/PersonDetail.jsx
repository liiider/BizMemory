import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, FileText, Tag, Trash2 } from 'lucide-react'
import { supabase } from '../store/supabaseClient'
import dayjs from 'dayjs'

export default function PersonDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [person, setPerson] = useState(null)
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        setLoading(true)

        // Fetch Person
        const { data: personData, error: personError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', id)
            .single()

        if (personError) {
            console.error(personError)
            setLoading(false)
            return
        }
        setPerson(personData)

        // Fetch Records
        const { data: recordsData, error: recordsError } = await supabase
            .from('records')
            .select('*')
            .eq('contact_id', id)
            .order('created_at', { ascending: false })

        if (recordsError) console.error(recordsError)
        else setRecords(recordsData || [])

        setLoading(false)
    }

    const deletePerson = async () => {
        if (!confirm('Are you sure you want to delete this person and all their history? This cannot be undone.')) return;

        try {
            setLoading(true);
            // Delete records first (FK constraint)
            const { error: rError } = await supabase
                .from('records')
                .delete()
                .eq('contact_id', id);

            if (rError) throw rError;

            // Delete person
            const { error: pError } = await supabase
                .from('contacts')
                .delete()
                .eq('id', id);

            if (pError) throw pError;

            navigate('/');
        } catch (e) {
            console.error('Delete error:', e);
            alert('Error deleting person: ' + e.message);
            setLoading(false);
        }
    }

    const deleteRecord = async (recordId, e) => {
        e.stopPropagation(); // Prevent opening image
        if (!confirm('Delete this record?')) return;

        try {
            const { error } = await supabase
                .from('records')
                .delete()
                .eq('id', recordId);

            if (error) throw error;

            // Update UI locally
            setRecords(prev => prev.filter(r => r.id !== recordId));
        } catch (err) {
            console.error(err);
            alert('Error deleting record');
        }
    }

    if (loading) return <div className="p-4 text-center text-slate-400">Loading profile...</div>
    if (!person) return <div className="p-4 text-center">Person not found</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">{person.name}</h1>
                    {/* Header Tags from Latest Record */}
                    <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
                        {(() => {
                            const latestRecord = records[0];
                            let headerTags = [];
                            if (latestRecord?.analysis_result) {
                                const r = latestRecord.analysis_result;
                                if (r.tag) headerTags = r.tag.split(/[ ,，]+/).filter(k => k.length > 0);
                                else if (r.keywords) headerTags = r.keywords.split(/[ ,，]+/).filter(k => k.length > 0).slice(0, 5);
                            }

                            if (headerTags.length === 0) return <span className="text-sm text-slate-400 italic">No tags</span>;

                            return headerTags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap"
                                >
                                    {tag}
                                </span>
                            ));
                        })()}
                    </div>
                </div>
                <button
                    onClick={deletePerson}
                    className="ml-auto p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Person"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Records Timeline */}
            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 px-1">History</h2>

                {records.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400">No records yet.</p>
                    </div>
                ) : (
                    records.map((record) => (
                        <div key={record.id} className="relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-4 group">
                            <button
                                onClick={(e) => deleteRecord(record.id, e)}
                                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full z-10"
                                title="Delete Record"
                            >
                                <Trash2 size={16} />
                            </button>
                            {/* Image Thumbnail */}
                            <div className="flex-shrink-0 w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer" onClick={() => record.image_url && window.open(record.image_url, '_blank')}>
                                {record.image_url ? (
                                    <img src={record.image_url} alt="Record" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <FileText size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center text-xs text-slate-400 gap-1">
                                    <Clock size={12} />
                                    <span>{dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}</span>
                                </div>

                                {/* Analysis Content */}
                                <div className="text-sm text-slate-700">
                                    {(() => {
                                        const result = record.analysis_result;
                                        if (result?.status === 'pending') {
                                            return (
                                                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                                    Analysis Pending
                                                </span>
                                            );
                                        }

                                        // Helper to safely extract data
                                        let data = {};
                                        let rawText = "";

                                        if (typeof result === 'object' && result !== null && !result.raw) {
                                            data = result;
                                        } else if (typeof result?.analysis === 'string') {
                                            rawText = result.analysis;
                                            try {
                                                // Try to clean potential markdown json blocks
                                                const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
                                                data = JSON.parse(cleanJson);
                                            } catch (e) {
                                                // Failed to parse, treat as raw text
                                                data = { summary: rawText };
                                            }
                                        } else {
                                            data = { summary: JSON.stringify(result) };
                                        }

                                        // Render Logic
                                        return (
                                            <div className="space-y-2">
                                                {/* Summary */}
                                                <p className="text-sm text-slate-700 leading-relaxed">
                                                    {data.summary || data.text || rawText || "No summary available."}
                                                </p>
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

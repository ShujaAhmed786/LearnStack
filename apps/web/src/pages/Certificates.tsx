import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { api } from '../lib/api';
import { Certificate } from '@learnstack/shared';
import {
  Award,
  Download,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Printer,
  X,
} from 'lucide-react';

export const Certificates: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCertificates() {
      try {
        setLoading(true);
        const data = await api.get<Certificate[]>('/v1/certificates');
        setCertificates(data);
      } catch (err) {
        console.error('Failed to load certificates:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCertificates();
  }, []);

  const copyVerificationLink = (certNumber: string) => {
    const url = `${window.location.origin}/verify/${certNumber}`;
    navigator.clipboard.writeText(url);
    setCopiedId(certNumber);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <Header
          title="Your Certificates"
          description="Official verifiable credentials of course completion"
        />
        <div className="max-w-content mx-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton height="220px" className="rounded-xl" />
            <Skeleton height="220px" className="rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header
        title="Your Certificates"
        description="Official verifiable credentials of course completion"
      />

      <div className="max-w-content mx-auto p-6 space-y-8">
        {certificates.length === 0 ? (
          <Card className="text-center py-16 px-6 bg-surface border-border max-w-xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
              <Award size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-20 font-bold text-text">No Certificates Earned Yet</h3>
              <p className="text-14 text-text-muted leading-relaxed max-w-md mx-auto">
                Complete all lessons and pass all module quizzes in any course to unlock your verifiable certificate of completion.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/courses">
                <Button className="bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold">
                  <BookOpen size={16} className="mr-2" />
                  <span>Browse Courses</span>
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => {
              const formattedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              return (
                <Card
                  key={cert.id}
                  className="p-6 bg-surface border-border hover:border-primary/40 transition-all flex flex-col justify-between space-y-5 group shadow-sm"
                >
                  <div className="space-y-4">
                    {/* Top Row: Verified Badge & ID */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-11 font-bold border border-emerald-500/25">
                        <ShieldCheck size={13} />
                        <span>VERIFIED CREDENTIAL</span>
                      </span>
                      <span className="text-11 font-mono text-text-muted">
                        {cert.certificateNumber}
                      </span>
                    </div>

                    {/* Course Title & Org */}
                    <div>
                      <h3 className="text-18 font-bold text-text group-hover:text-primary transition-colors">
                        {cert.course?.title || 'Course Completion'}
                      </h3>
                      <p className="text-13 text-text-muted mt-1 flex items-center gap-1.5">
                        <span>Issued by {cert.org?.name || 'LearnStack Academy'}</span>
                      </p>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-2 text-12 text-text-muted pt-2 border-t border-border">
                      <Calendar size={13} />
                      <span>Completed on {formattedDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedCert(cert)}
                      className="text-13 font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>View Certificate</span>
                      <ArrowRight size={14} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyVerificationLink(cert.certificateNumber)}
                        title="Copy verification URL"
                        className="p-2 rounded-lg bg-surface-hover hover:bg-border text-text-muted hover:text-text transition-colors text-12 flex items-center gap-1"
                      >
                        {copiedId === cert.certificateNumber ? (
                          <>
                            <Check size={14} className="text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Share</span>
                          </>
                        )}
                      </button>

                      <a
                        href={cert.pdfUrl || `/v1/certificates/${cert.certificateNumber}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-12 flex items-center gap-1.5 transition-colors border border-primary/20"
                      >
                        <Download size={13} />
                        <span>PDF</span>
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificate Preview Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X size={20} />
            </button>

            {/* Modal Actions Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-18 font-bold text-text">Certificate of Completion</h3>
                <p className="text-12 text-text-muted">
                  ID: <span className="font-mono">{selectedCert.certificateNumber}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg border border-border text-text hover:bg-surface-hover text-13 font-medium flex items-center gap-1.5"
                >
                  <Printer size={15} />
                  <span>Print</span>
                </button>
                <a
                  href={selectedCert.pdfUrl || `/v1/certificates/${selectedCert.certificateNumber}/pdf`}
                  download
                  className="px-4 py-1.5 rounded-lg bg-primary text-[#0A1628] hover:bg-primary-hover font-bold text-13 flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={15} />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>

            {/* Visual Certificate Card Frame */}
            <div className="p-8 sm:p-12 rounded-xl bg-gradient-to-b from-[#FAFBFC] to-[#F1F5F9] dark:from-[#0F172A] dark:to-[#0A1628] border-4 border-[#0A1628] dark:border-teal-500/40 relative shadow-inner text-center space-y-6">
              <div className="space-y-1">
                <span className="text-12 tracking-widest font-bold uppercase text-teal-600 dark:text-teal-400">
                  {selectedCert.org?.name || 'LearnStack Academy'}
                </span>
                <h2 className="text-24 sm:text-30 font-serif font-bold text-text tracking-wide">
                  CERTIFICATE OF COMPLETION
                </h2>
                <p className="text-12 tracking-wider text-text-muted uppercase">
                  This is proudly presented to
                </p>
              </div>

              <div className="py-2">
                <span className="text-28 sm:text-36 font-serif font-bold text-primary border-b-2 border-teal-500/60 pb-1 px-8 inline-block">
                  {selectedCert.user?.name || 'Learner'}
                </span>
              </div>

              <p className="text-13 sm:text-14 text-text-muted max-w-xl mx-auto leading-relaxed">
                for successfully completing all curriculum modules, practical exercises, and assessments in
              </p>

              <div>
                <h3 className="text-20 sm:text-24 font-bold text-text">
                  {selectedCert.course?.title || 'Interactive Course'}
                </h3>
              </div>

              <div className="pt-8 border-t border-border grid grid-cols-2 gap-4 text-center max-w-md mx-auto">
                <div>
                  <p className="text-13 font-bold text-text">
                    {new Date(selectedCert.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-11 text-text-muted mt-0.5">Date Issued</p>
                </div>
                <div>
                  <p className="text-13 font-bold text-text">
                    {selectedCert.org?.name || 'LearnStack Academy'}
                  </p>
                  <p className="text-11 text-text-muted mt-0.5">Authorized Issuer</p>
                </div>
              </div>

              <div className="pt-2 text-11 text-text-muted flex items-center justify-center gap-1 font-mono">
                <span>Public Verification URL:</span>
                <Link
                  to={`/verify/${selectedCert.certificateNumber}`}
                  target="_blank"
                  className="text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>learnstack.io/verify/{selectedCert.certificateNumber}</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

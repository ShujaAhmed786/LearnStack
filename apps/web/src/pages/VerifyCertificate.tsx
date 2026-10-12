import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { api } from '../lib/api';
import { VerifyCertificateResponse } from '@learnstack/shared';
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Building,
  User,
  BookOpen,
  Download,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const VerifyCertificate: React.FC = () => {
  const { number } = useParams<{ number: string }>();
  const [data, setData] = useState<VerifyCertificateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!number) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<VerifyCertificateResponse>(
          `/v1/certificates/${number}/verify`
        );
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Invalid or unverifiable certificate');
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [number]);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <Link to="/" className="inline-flex items-center gap-2 font-heading font-bold text-20 text-text">
            <span className="w-8 h-8 rounded-lg bg-primary text-[#0A1628] flex items-center justify-center font-bold">
              LS
            </span>
            <span>LearnStack</span>
          </Link>
          <p className="text-12 text-text-muted">Credential Verification Registry</p>
        </div>

        {loading ? (
          <Card className="p-8 space-y-5 bg-surface border-border shadow-md">
            <Skeleton height="36px" className="w-48 mx-auto" />
            <Skeleton height="140px" className="w-full" />
            <Skeleton height="40px" className="w-32 mx-auto" />
          </Card>
        ) : error || !data?.valid ? (
          <Card className="p-8 sm:p-10 bg-surface border-border text-center space-y-6 shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger border border-danger/20 mx-auto flex items-center justify-center">
              <ShieldAlert size={36} />
            </div>
            <div className="space-y-2">
              <h1 className="text-22 font-bold text-text">Certificate Not Verified</h1>
              <p className="text-14 text-text-muted max-w-sm mx-auto leading-relaxed">
                The certificate number <span className="font-mono font-bold text-text">{number}</span> could not be verified in our registry. It may have expired, been revoked, or entered incorrectly.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-13 font-semibold text-primary hover:underline"
              >
                <span>Back to LearnStack Home</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-8 sm:p-10 bg-surface border-border space-y-6 shadow-lg">
            {/* Verified Badge */}
            <div className="text-center space-y-3 pb-6 border-b border-border">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 mx-auto flex items-center justify-center shadow-xs">
                <ShieldCheck size={36} />
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-12 border border-emerald-500/30 uppercase tracking-wide">
                  Authentic & Verified
                </span>
                <h1 className="text-22 font-bold text-text mt-2">
                  Official Course Completion Certificate
                </h1>
                <p className="text-12 font-mono text-text-muted mt-0.5">
                  ID: {data.certificateNumber || number}
                </p>
              </div>
            </div>

            {/* Credential Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface-hover/60 border border-border">
                <User size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-11 text-text-muted uppercase tracking-wider font-semibold">
                    Recipient
                  </span>
                  <p className="text-15 font-bold text-text mt-0.5">{data.holderName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface-hover/60 border border-border">
                <BookOpen size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-11 text-text-muted uppercase tracking-wider font-semibold">
                    Course Completed
                  </span>
                  <p className="text-15 font-bold text-text mt-0.5">{data.courseTitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-hover/60 border border-border">
                  <Building size={18} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-11 text-text-muted uppercase tracking-wider font-semibold">
                      Issuing Org
                    </span>
                    <p className="text-14 font-semibold text-text mt-0.5">
                      {data.orgName || 'LearnStack'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-hover/60 border border-border">
                  <Calendar size={18} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-11 text-text-muted uppercase tracking-wider font-semibold">
                      Date Issued
                    </span>
                    <p className="text-14 font-semibold text-text mt-0.5">
                      {data.issuedAt
                        ? new Date(data.issuedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={data.pdfUrl || `/v1/certificates/${data.certificateNumber || number}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-[#0A1628] hover:bg-primary-hover font-bold text-13 flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Download size={15} />
                <span>Download Official PDF</span>
              </a>

              <Link
                to="/"
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-border text-text hover:bg-surface-hover font-medium text-13 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>LearnStack</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </Card>
        )}
      </div>

      <div className="text-center text-12 text-text-muted pt-8">
        LearnStack Credential Verification &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
};

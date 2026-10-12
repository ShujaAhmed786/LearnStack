import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';

export const PurchaseCancelled: React.FC = () => {
  const [searchParams] = useSearchParams();
  const courseSlug = searchParams.get('course');

  const backUrl = courseSlug ? `/courses/${courseSlug}` : '/courses';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Card className="p-8 md:p-10 bg-surface border-border text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle size={36} />
          </div>

          <div className="space-y-2">
            <h1 className="text-28 font-heading font-bold text-text">Checkout Cancelled</h1>
            <p className="text-15 text-text-muted max-w-md mx-auto leading-relaxed">
              No payment was processed and no charges were made. You can review course details and enroll whenever you are ready.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={backUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-[#0A1628] font-bold text-14 transition-colors shadow-sm"
            >
              <ArrowLeft size={16} />
              <span>Return to Course</span>
            </Link>
            <Link
              to="/courses"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-surface-hover hover:bg-surface border border-border text-text font-medium text-14 transition-colors"
            >
              <BookOpen size={16} />
              <span>Explore All Courses</span>
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

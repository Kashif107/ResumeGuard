import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useApiStore } from "~/lib/api";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => [
  { title: "Resumind | Review " },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, resumes } = useApiStore();
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [statusText, setStatusText] = useState("Analyzing...");
  const navigate = useNavigate();
  const pollRef = useRef(null);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
  }, [isLoading, auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const poll = async () => {
      try {
        const data = await resumes.get(id);
        setRecord(data);

        if (data.status === "done" || data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (data.status === "failed") setStatusText("Analysis failed. Please try again.");
        }
      } catch (err) {
        console.error(err);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, auth.isAuthenticated]);

  const feedback = record?.feedback;
  const isPending = !record || record.status === "pending";

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {record?.imageUrl && record?.resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={record.resumeUrl} target="_blank" rel="noopener noreferrer">
                <img src={record.imageUrl} className="w-full h-full object-contain rounded-2xl" title="resume" />
              </a>
            </div>
          )}
        </section>
        <section className="feedback-section">
          <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
              <Details feedback={feedback} />
            </div>
          ) : (
            <>
              <p>{isPending ? "Analyzing your resume — this can take a moment..." : statusText}</p>
              <img src="/images/resume-scan-2.gif" className="w-full" />
            </>
          )}
        </section>
      </div>
    </main>
  );
};
export default Resume;

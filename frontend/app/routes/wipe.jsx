import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useApiStore } from "~/lib/api";

const WipeApp = () => {
  const { auth, isLoading, error, clearError, resumes } = useApiStore();
  const navigate = useNavigate();
  const [resumeList, setResumeList] = useState([]);

  const loadResumes = async () => {
    const data = await resumes.list();
    setResumeList(data || []);
  };

  useEffect(() => {
    loadResumes();
  }, []);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/wipe");
    }
  }, [isLoading, auth.isAuthenticated]);

  const handleDelete = async () => {
    await resumes.wipeAll();
    loadResumes();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error {error}</div>;
  }

  return (
    <div>
      Authenticated as: {auth.user?.name || auth.user?.email}
      <div>Existing resumes:</div>
      <div className="flex flex-col gap-4">
        {resumeList.map((resume) => (
          <div key={resume.id} className="flex flex-row gap-4">
            <p>{resume.jobTitle || resume.id}</p>
          </div>
        ))}
      </div>
      <div>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-md cursor-pointer" onClick={() => handleDelete()}>
          Wipe App Data
        </button>
      </div>
    </div>
  );
};

export default WipeApp;

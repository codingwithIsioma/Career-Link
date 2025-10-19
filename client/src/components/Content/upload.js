import { Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import { CheckCircle, Lightbulb } from "lucide-react";
import UploadDetails from "./uploaddetails";
import UploadCard from "./uploadcard";
import UploadHeading from "./uploadheading";
import Recommendation from "./recommendation";

function Upload({ cuteMode, feedback, setFeedback }) {
  const hasShownToast = useRef(false);
  // for uploading logic
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSucces, setUploadSuccess] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [analyzedSkills, setAnalyzedSkills] = useState(null);
  const [analyzedExperience, setAnalyzedExperience] = useState(null);
  const [progress, setProgress] = useState(0);

  // for get recommendation logic
  const [isLoading, setIsLoading] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [tips, setTips] = useState([]);
  const [showTipToast, setShowTipToast] = useState(false);
  const [showTipPanel, setShowTipPanel] = useState(false);

  // for preferences logic
  const [userPreferences, setUserPreferences] = useState({});
  // retrieves and sets the traits list on opening the site
  useEffect(() => {
    const storedPreferences = localStorage.getItem("traits_count");
    if (storedPreferences) {
      const parsed = JSON.parse(storedPreferences);
      getUserPreference(parsed); // pass the traits to your POST request logic
    }
  }, []);

  // handles retrieving the user preference list from the recommendationlist component
  const getUserPreference = (value) => {
    setUserPreferences(value);
  };

  // handles file uploading logic
  // backend todo: upload file to the supabase storage ✅
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      const formData = new FormData();
      formData.append("resume", file);

      setIsUploading(true);
      localStorage.removeItem("recommendations"); // remove previous recommendation from local storage before fetching a new one.
      setProgress(0);

      let interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95; // cap at 95 until backend responds
          return prev + 5;
        });
      }, 200);

      fetch(`${process.env.REACT_APP_RENDER_URL}/api/v1/jobs/upload_resume`, {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
        })
        .then((result) => {
          setUploadResult(result.data.uuid);
          setAnalyzedSkills(result.data.skills_list);
          setAnalyzedExperience(result.data.recent_experience);
          setFile(file.name);
          clearInterval(interval);
          setProgress(100);
          setIsUploading(false);
          setUploadSuccess(true);
          setShowUploadSuccess(true);
          if (showUploadSuccess) {
            setAnalysisDone(false);
          }
        })
        .catch((err) => console.log(err));
    }
  };

  // handles the analyzing of the file upload to then return the jobs
  // backend todo:
  // - passes through the uuid of the embedding, gets jobs from api, cosine similarity of resume and job vectors. ✅
  // - gets the list of recommended jobs ✅
  const handleAnalyze = () => {
    setIsLoading(true);
    setShowUploadSuccess(false);
    setFeedback({});
    const userData = {
      uuid: uploadResult,
      userPreferenceList: [userPreferences],
    };
    fetch(`${process.env.REACT_APP_RENDER_URL}/api/v1/jobs/recommend_jobs`, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify(userData),
    })
      .then((analyzeResponse) => {
        if (analyzeResponse.ok) {
          return analyzeResponse.json();
        }
      })
      .then((analyzeData) => {
        const jobData = analyzeData.data;
        setIsLoading(false);
        setAnalysisDone(true);
        setAnalysisResult(jobData);
        setTips(analyzeData.tips);
        setShowTipToast(true);
        localStorage.setItem("recommendations", JSON.stringify(jobData)); // sets the newly fetched recommendations into the local storage
        localStorage.setItem("fresh_upload", "true");
        sessionStorage.removeItem("toast_shown");
      })
      .catch((err) => console.log(`There was an error in fetching: ${err}`));
  };

  // returns the recommended jobs from local storage, but asks the user if they want to first
  useEffect(() => {
    const recommendations = localStorage.getItem("recommendations");
    const isFreshUpload = localStorage.getItem("fresh_upload") === "true";
    const hasShownThisSession = sessionStorage.getItem("toast_shown");

    if (
      recommendations &&
      !isFreshUpload &&
      !hasShownThisSession &&
      !hasShownToast.current
    ) {
      hasShownToast.current = true;
      sessionStorage.setItem("toast_shown", "true");

      setTimeout(() => {
        toast.custom(
          (t) => (
            <div
              className={`bg-white shadow-lg rounded-xl p-4 text-sm flex flex-col gap-2 font-medium transition-all duration-500 transform
              ${
                t.visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-10 opacity-0"
              }
              fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md`}
            >
              <p className="font-normal text-xs">🌸 Welcome back, superstar!</p>
              <p className="text-sm">
                Would you like to continue where you left off? 💼✨
              </p>

              <div className="flex justify-end gap-2">
                <button
                  className="px-3 py-1 rounded bg-[#f0f2f4] text-gray-700"
                  onClick={() => {
                    setAnalysisResult(JSON.parse(recommendations));
                    setAnalysisDone(true);
                    toast.dismiss(t.id);
                  }}
                >
                  Continue
                </button>
                <button
                  className="px-3 py-1 rounded bg-red-100 text-gray-700 "
                  onClick={() => {
                    localStorage.removeItem("recommendations");
                    toast.dismiss(t.id);
                  }}
                >
                  Re-upload
                </button>
              </div>
            </div>
          ),
          { duration: 10000 }
        );
      }, 2000);
    }

    sessionStorage.removeItem("toast_shown");
    localStorage.removeItem("fresh_upload");
  }, []);

  // removes the uploaded success message after a second
  // useEffect(() => {
  //   if (showUploadSuccess) {
  //     const timer = setTimeout(() => {
  //       setShowUploadSuccess(false);
  //     }, 2000);

  //     return () => clearTimeout(timer); // cleanup if component unmounts
  //   }
  // }, [showUploadSuccess]);

  return (
    <Fragment>
      <UploadDetails />
      <Toaster position="bottom-center" />
      <UploadCard>
        <div
          className={`flex flex-col items-center gap-6 rounded-xl border-2 border-dashed border-[#dce1e5] px-4 sm:px-6 py-10 sm:py-14 transition-colors`}
        >
          <UploadHeading />
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="resume-upload"
          />
          <label htmlFor="resume-upload">
            <span
              className={`cursor-pointer rounded-xl h-10 px-4 bg-[#f0f2f4] text-[#013237] text-sm font-bold inline-flex items-center justify-center`}
            >
              Browse Files
            </span>
          </label>
          {isUploading && (
            <div className="space-y-1">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Processing your resume...
                </p>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-800 h-2 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!uploadSucces}
          className={`mt-4 rounded-xl h-10 px-4 bg-[#013237] text-white text-sm font-bold`}
        >
          Get Recommendations
        </button>
        {showUploadSuccess && (
          <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 mb-2 text-xl font-semibold">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Resume Analyzed
            </h3>
            <p className="mb-1 text-sm text-[#3B5E5E]">
              File: <span className="font-medium text-[#0C2B2B]">{file}</span>
            </p>
            {!!analyzedSkills?.length && (
              <div className="mb-3">
                <p className="mb-1 text-sm font-medium">Skills Found</p>
                <div className="flex flex-wrap gap-2">
                  {analyzedSkills.slice(0, 8).map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#F1F5F4] px-2 py-1 text-xs text-[#0C2B2B]"
                    >
                      {s}
                    </span>
                  ))}
                  {analyzedSkills.length > 8 && (
                    <span className="text-xs">
                      +{analyzedSkills.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {!!analyzedExperience?.length && (
              <div>
                <p className="mb-1 text-sm font-medium">Recent Experience</p>
                <ul className="space-y-1 text-xs text-[#3B5E5E]">
                  {analyzedExperience.slice(0, 2).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </UploadCard>

      {/* concerns what happens AFTER get recommendations button has been clicked */}
      {isLoading && (
        <div className="text-center py-5">
          <div
            className={`animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-[#111518] rounded-full`}
            role="status"
          />
          <p className={`text-sm mt-2`}>Give it a moment...</p>
        </div>
      )}
      {analysisDone && (
        <Recommendation
          jobs={analysisResult}
          retrievePreferences={getUserPreference}
          cuteMode={cuteMode}
          feedback={feedback}
          setFeedback={setFeedback}
        />
      )}

      {/* Resume tips: toaster + slide-in panel */}
      {tips.length > 0 && showTipToast && !showTipPanel && (
        <div className="fixed bottom-6 right-6 z-40 w-[300px] rounded-md border border-[#C7D5D4] bg-white p-3 shadow-lg">
          <div className="mb-1 text-sm font-medium text-[#0C2B2B]">
            Resume tips available
          </div>
          <p className="mb-3 text-xs text-[#3B5E5E]">
            We found quick suggestions to improve your resume.
          </p>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-md bg-[#063C3C] px-3 py-1.5 text-xs font-semibold text-white"
              onClick={() => {
                setShowTipPanel(true);
                setShowTipToast(false);
              }}
            >
              View tips
            </button>
            <button
              className="rounded-md border border-[#C7D5D4] px-3 py-1.5 text-xs"
              onClick={() => setShowTipToast(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {tips.length > 0 && showTipPanel && (
        <div className="fixed bottom-6 right-6 z-40 w-[340px] rounded-xl border border-[#C7D5D4] bg-white p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-semibold text-[#0C2B2B]">
              Resume Tips <Lightbulb className="w-4 h-4" />
            </div>
            <button
              className="rounded p-1 text-[#0C2B2B] hover:bg-[#F1F5F4]"
              onClick={() => {
                setTips([]);
                setShowTipPanel(false);
              }}
              aria-label="Close"
            >
              x
            </button>
          </div>
          <ul className="mb-3 list-disc space-y-2 pl-5 text-xs text-[#0C2B2B]">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <button
              className="rounded-md border border-[#C7D5D4] px-3 py-1.5 text-xs"
              onClick={() => {
                setTips([]);
                setShowTipPanel(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Fragment>
  );
}

export default Upload;

import { useState, useRef, useEffect, Fragment, useMemo } from "react";
import {
  Building2,
  Banknote,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  MapPin,
  Clock,
} from "lucide-react";

const SALARY_BANDS = {
  Any: [0, Number.MAX_SAFE_INTEGER],
  "<€50k": [0, 50000],
  "€50k - €100k": [50000, 100000],
  "€100k - €150k": [100000, 150000],
  ">€150k": [150000, Number.MAX_SAFE_INTEGER],
};

function RecommendationList({
  joblist,
  handlePreferenceRetrieval,
  feedback,
  setFeedback,
}) {
  const [expanded, setExpanded] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState(null);
  const [modalReasons, setModalReasons] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // filter states
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("Any");
  const [band, setBand] = useState("Any");

  const allPreferencesRef = useRef({});

  // filter logic
  const filtered = useMemo(() => {
    const [min, max] = SALARY_BANDS[band] || SALARY_BANDS.Any;
    return joblist
      .filter((j) => {
        const needle = loc.trim().toLowerCase();
        if (!needle) return true;
        return [j.job_city, j.job_state]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .filter((j) =>
        type === "Any"
          ? true
          : (j.contract_time || "").replace("_", "-").toLowerCase() ===
            type.toLowerCase()
      )
      .filter((j) =>
        j.salary == null || isNaN(j.salary)
          ? true
          : j.salary >= min && j.salary <= max
      );
  }, [joblist, loc, type, band]);

  const visible = showAll ? filtered : filtered.slice(0, 5);

  // retrieve from localStorage and save in ref.current
  useEffect(() => {
    const storedPrefs = localStorage.getItem("traits_count");
    if (storedPrefs) {
      try {
        allPreferencesRef.current = JSON.parse(storedPrefs);
      } catch (e) {
        console.error("Failed to parse stored preferences", e);
      }
    }
  }, []);

  // handles the see more/see less buttons
  const toggleExpand = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  // truncates the description to just 20 words
  const truncate = (text, index) => {
    const words = text.split(" ");
    if (expanded === index) return text;
    return words.slice(0, 20).join(" ") + (words.length > 20 ? "..." : "");
  };

  // handles the click of the like and dislike button
  const handleFeedback = (index, type) => {
    setFeedbackModal({ index, type });
    const jobTitle = joblist[index].job_title;
    const jobDescription = joblist[index].job_description;
    fetch(process.env.REACT_APP_OPEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_OPEN_ROUTER}`,
        "Content-Type": "application/json",
        "X-Title": "Career Link",
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: `extract 3 of the most relevant industry focused keywords from this description: ${jobDescription}. return just those three keywords separated my commas.`,
          },
        ],
      }),
    })
      .then((res) => res.ok && res.json())
      .then((result) => {
        const rawKeywords =
          result.choices?.[0]?.message?.content?.split(",") ?? [];
        const jobKeywords = rawKeywords.map((k) => k.trim());
        setModalReasons([
          `Title: ${jobTitle}`,
          `Mentions: ${jobKeywords[0] || "N/A"}`,
          `Mentions: ${jobKeywords[1] || "N/A"}`,
          `Mentions: ${jobKeywords[2] || "N/A"}`,
        ]);
      });
  };

  // cancels the process of liking or disliking
  const handleCancel = () => {
    setFeedbackModal(null);
    setModalReasons(null);
  };

  // hangles retrieving the reasons from the checkbox
  // to-do: remove the prefixes from reason
  const toggleReason = (reason) => {
    const index = feedbackModal.index;
    setFeedback((prev) => {
      const prevReasons = prev[index]?.reasons || [];
      const newReasons = prevReasons.includes(reason)
        ? prevReasons.filter((r) => r !== reason)
        : [...prevReasons, reason];
      return {
        ...prev,
        [index]: {
          ...prev[index],
          reasons: newReasons,
          type: feedbackModal.type,
        },
      };
    });
  };

  // handles the saving of preferences and setting to localStorage
  const handleSavePreferences = (index) => {
    const userFeedback = feedback[index];

    if (!userFeedback?.reasons?.length || !userFeedback?.type) return;

    const updatedPreferences = { ...allPreferencesRef.current };

    userFeedback.reasons.forEach((reason) => {
      const cleanReason = reason
        .replace(/^.*?:\s*/, "") // removes any "prefix: " part
        .trim()
        .toLowerCase();

      // Initialize if not already saved
      if (!updatedPreferences[cleanReason]) {
        updatedPreferences[cleanReason] = { liked: 0, disliked: 0 };
      }

      if (feedbackModal?.type === "like") {
        updatedPreferences[cleanReason].liked += 1;
      } else {
        updatedPreferences[cleanReason].disliked += 1;
      }
    });

    // save to ref and localStorage
    allPreferencesRef.current = updatedPreferences;
    localStorage.setItem(
      "traits_count",
      JSON.stringify(allPreferencesRef.current)
    );

    handlePreferenceRetrieval(allPreferencesRef.current);

    setFeedback((prev) => ({
      ...prev,
      [index]: { ...prev[index], disabled: true },
    }));
    setFeedbackModal(null);
    setModalReasons(null);
    setConfirmationMessage(index);
    setTimeout(() => {
      setConfirmationMessage(null);
    }, 3000);
  };

  return (
    <Fragment>
      {/* Filter bar (recommended jobs only) */}
      <div className="mb-4 grid gap-3 rounded-xl bg-transparent p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-[#3B5E5E]">Location</label>
          <input
            className="w-full rounded-md border border-[#C7D5D4] px-3 py-2 text-sm"
            placeholder="City or State"
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#3B5E5E]">Job Type</label>
          <select
            className="w-full rounded-md border border-[#C7D5D4] px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {["Any", "Full-time", "Part-time"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#3B5E5E]">
            Salary Range
          </label>
          <select
            className="w-full rounded-md border border-[#C7D5D4] px-3 py-2 text-sm"
            value={band}
            onChange={(e) => setBand(e.target.value)}
          >
            {Object.keys(SALARY_BANDS).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            className="w-full rounded-md border border-[#C7D5D4] px-3 py-2 text-sm"
            onClick={() => {
              setLoc("");
              setType("Any");
              setBand("Any");
            }}
          >
            Clear
          </button>
        </div>
      </div>
      {visible.map((job, index) => (
        <div key={index} className="p-4">
          <div className="relative flex flex-col md:flex-row justify-between gap-4 rounded-xl bg-white p-4 shadow-md transition-shadow duration-300 cursor-pointer hover:shadow-lg hover:shadow-gray-200">
            <div className="flex-[2_2_0px] flex-col gap-4">
              <div
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-[11px] font-semibold text-[#063C3C]"
                style={{
                  background: `conic-gradient(#4ca771 ${
                    Math.min(
                      100,
                      Math.max(
                        0,
                        Number.isFinite(Number(job?.score))
                          ? Number(job.score) <= 1
                            ? Math.round(Number(job.score) * 100)
                            : Math.round(Number(job.score))
                          : 0
                      )
                    ) * 3.6
                  }deg, #E6ECEB ${
                    Math.min(
                      100,
                      Math.max(
                        0,
                        Number.isFinite(Number(job?.score))
                          ? Number(job.score) <= 1
                            ? Math.round(Number(job.score) * 100)
                            : Math.round(Number(job.score))
                          : 0
                      )
                    ) * 3.6
                  }deg 360deg)`,
                }}
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white">
                  {Number.isFinite(Number(job?.score))
                    ? Number(job.score) <= 1
                      ? Math.round(Number(job.score) * 100)
                      : Math.round(Math.min(100, Number(job.score)))
                    : 0}
                  %
                </div>
              </div>
              <div className={`flex items-center gap-2 text-sm text-[#637788]`}>
                <Building2 size={16} />
                <span>{job.company_name}</span>
              </div>
              <p className={`text-base font-bold text-[#013237]`}>
                {job.job_title}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#637788]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />{" "}
                  {job.job_state || job.job_city || "-"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Banknote className="h-4 w-4" />{" "}
                  {job.salary ? `€${Number(job.salary).toLocaleString()}` : "—"}
                </span>
                {job.contract_time ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />{" "}
                    {job.contract_time === "full_time"
                      ? "Full-time"
                      : "Part-time"}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-[#637788]">
                {truncate(job.job_description, index)}
                {job.job_description.split(" ").length > 20 && (
                  <button
                    className="text-[#637788]"
                    onClick={() => toggleExpand(index)}
                  >
                    {expanded === index ? (
                      <span className="inline-flex items-center">
                        <i>see less</i>
                      </span>
                    ) : (
                      <span className="inline-flex items-center">
                        <i>see more</i>
                      </span>
                    )}
                  </button>
                )}
              </p>
              {/* <p className={`text-sm font-medium text-[#4ca771]`}>
                Match Score: {(job.score * 100).toFixed(0)}%
              </p> */}
              <button
                className={`rounded-xl mt-4 h-8 px-4 bg-[#f0f2f4] text-[#013237] text-sm font-medium`}
              >
                <a href={job.apply_link}>Apply</a>
              </button>
            </div>
            {/* Feedback buttons */}
            <div className="flex justify-end gap-1 md:place-items-end md:ml-0">
              <button
                onClick={() => handleFeedback(index, "like")}
                disabled={feedback[index]?.disabled}
                className={`rounded-full p-2 transition ${
                  feedback[index]?.disabled ? "opacity-50" : "hover:scale-110"
                } bg-green-100 text-[#637788]`}
              >
                <ThumbsUp
                  size={18}
                  className={
                    feedbackModal?.index === index &&
                    feedbackModal.type === "like" &&
                    `transition transform scale-110 text-green-600`
                  }
                />
              </button>
              <button
                onClick={() => handleFeedback(index, "dislike")}
                className={`rounded-full p-2 transtion ${
                  feedback[index]?.disabled ? "opacity-50" : "hover:scale-110"
                }  bg-red-100 text-[#637788]`}
              >
                <ThumbsDown
                  size={18}
                  className={
                    feedbackModal?.index === index &&
                    feedbackModal.type === "dislike" &&
                    `transition transform scale-110 text-red-400`
                  }
                />
              </button>
            </div>
          </div>
          {/* Feedback Modal */}
          {modalReasons && feedbackModal?.index === index && (
            <div className="p-4 border rounded-lg bg-gray-100 animate-slide-up text-sm">
              <p className="font-medium text-[#013237]">
                💭{" "}
                {feedbackModal.type === "like"
                  ? "What do you like about this job?"
                  : "Why don't you like this job?"}
              </p>
              <p className="text-xs mb-2 italic text-[#637788]">
                (select all that apply)
              </p>
              <div className="flex flex-col gap-1 mt-1">
                {modalReasons.map((reason, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md ${
                      feedback[index]?.reasons?.includes(reason)
                        ? "bg-green-50 border-green-400"
                        : "bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 mr-1 rounded border-gray-300 text-green-600 accent-green-600 focus:ring-0 cursor-pointer"
                      onChange={() => toggleReason(reason)}
                      checked={
                        feedback[index]?.reasons?.includes(reason) || false
                      }
                    />
                    <span className="text-xs text-gray-700 font-medium">
                      {reason}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => handleSavePreferences(index)}
                  className="inline-flex items-center gap-1 bg-[#013237] text-white text-xs px-3 py-1.5 rounded-md hover:bg-[#1a1f23] transition"
                >
                  <Check size={14} /> Save Preferences
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1 bg-gray-200 text-[#013237] text-xs px-4 py-2 rounded-md hover:bg-gray-300 transition"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}
          {/* Feedback Message */}
          {confirmationMessage === index && (
            <p className="text-xs mt-2 text-[#637788] animate-fade-in">
              Your response has been recorded. We'll tailor future results
              accordingly.
            </p>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-center text-gray-500 mt-4">
          No jobs match your filters. Try adjusting the location, job type, or
          salary range.
        </p>
      )}

      {filtered.length !== 0 && filtered.length > 5 && (
        <div className="mt-6 text-center">
          <button
            className="rounded-md border border-[#C7D5D4] px-4 py-2 text-sm"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </Fragment>
  );
}

export default RecommendationList;

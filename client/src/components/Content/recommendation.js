import { Fragment } from "react/jsx-runtime";
import RecommendationList from "./recommendationlist";

function Recommendation({
  jobs,
  retrievePreferences,
  cuteMode,
  feedback,
  setFeedback,
}) {
  return (
    <Fragment>
      <h2
        className={`text-xl md:text-[22px] font-bold px-4 pb-3 pt-5 text-center md:text-left text-[#013237]`}
      >
        Top Recommendations
      </h2>
      <RecommendationList
        joblist={jobs}
        handlePreferenceRetrieval={retrievePreferences}
        cuteMode={cuteMode}
        setFeedback={setFeedback}
        feedback={feedback}
      />
    </Fragment>
  );
}

export default Recommendation;

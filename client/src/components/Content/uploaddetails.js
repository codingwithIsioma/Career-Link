import { Fragment } from "react";

function UploadDetails() {
  return (
    <Fragment>
      <h2
        className={`text-2xl md:text-[28px] font-bold px-4 pb-3 pt-5 text-center md:text-left text-[#013237]`}
      >
        Find your dream job with CareerLink
      </h2>
      <p
        className={`text-base px-4 pb-3 pt-1 text-center md:text-left text-[#013237]`}
      >
        Upload your text-based PDF resume to receive personalized job
        recommendations.
      </p>
    </Fragment>
  );
}

export default UploadDetails;

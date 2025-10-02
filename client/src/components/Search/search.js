import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function SearchPage({ setPage, searchValue, searchResults, isLoading }) {
  const [expanded, setExpanded] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // handles the pagination functionality of the search page
  const jobsPerPage = 5;
  const totalPages = Math.ceil(searchResults.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const paginatedJobs = searchResults.slice(startIndex, endIndex);

  // handles the see more/see less buttons
  const toggleExpand = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  // truncates the description to just 20 words
  const truncate = (text, index) => {
    const words = text.split(" ");
    if (expanded === index) return text;
    return words.slice(0, 30).join(" ") + (words.length > 30 ? "..." : "");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchResults]);

  return (
    <main className="px-4 md:px-10 lg:px-20 xl:px-40 py-3">
      {isLoading && (
        <p className="flex text-lg text-gray-500 items-center justify-center animate-pulse mb-4">
          🔍 Searching for jobs...
        </p>
      )}
      {/* Back Button - goes back to the main page */}
      <div className="flex justify-end w-full mb-1">
        <button
          onClick={() => setPage("main")}
          className="text-sm font-medium text-gray-500 hover:text-[#013237] transition px-3 py-1.5 border border-gray-300 rounded-full shadow-sm active:scale-95"
        >
          ← Back
        </button>
      </div>
      <h2 className="text-xl font-bold mb-6">
        {searchResults.length} results for "{searchValue}"
      </h2>
      {/* search results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          {paginatedJobs.map((job, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border">
              <h3 className="font-bold text-md text-[#013237]">{job.title}</h3>
              <p className="text-xs font-normal text-gray-600">
                {job.company.display_name || "TBD"} ·{" "}
                {job.location.display_name || "TBD"}
              </p>
              <p className="text-sm text-[#637788] mt-1">
                {truncate(job.description, i)}
                {job.description.split(" ").length > 30 && (
                  <button
                    className="text-[#637788]"
                    onClick={() => toggleExpand(i)}
                  >
                    {expanded === i ? (
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
              <div className="mt-3">
                <button className="px-4 py-1.5 bg-gray-100 text-xs text-[#013237] font-medium rounded-xl">
                  <a href={job.redirect_url}>Apply</a>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {searchResults.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center mt-12 animate-fade-in-up">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700">
            No results found
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            We couldn't find any jobs matching "
            <span className="font-medium text-black">{searchValue}</span>".
            <br />
            Try adjusting your search or using a different title.
          </p>
        </div>
      )}

      {/* Pagination controls */}
      {searchResults.length > 0 && (
        <div className="flex justify-center items-center mt-6 space-x-2 animate-fade-in">
          <button
            onClick={() => {
              setCurrentPage((prev) => Math.max(prev - 1, 1));
            }}
            disabled={currentPage === 1}
            className={`px-1 py-1 text-sm rounded-md ${
              currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#013237] text-white hover:bg-gray-800"
            } transition`}
          >
            <ChevronLeft size={13} />
          </button>
          {(() => {
            const maxPages = 5;
            const range = [];

            if (totalPages <= maxPages) {
              for (let i = 1; i <= totalPages; i++) range.push(i);
            } else {
              if (currentPage <= 3) {
                range.push(1, 2, 3, "...", totalPages);
              } else if (currentPage >= totalPages - 2) {
                range.push(
                  1,
                  "...",
                  totalPages - 2,
                  totalPages - 1,
                  totalPages
                );
              } else {
                range.push(1, "...", currentPage, "...", totalPages);
              }
            }

            return range.map((page, index) =>
              page === "..." ? (
                <span key={index} className="px-2 text-gray-400 select-none">
                  ...
                </span>
              ) : (
                <button
                  key={index}
                  onClick={() => setCurrentPage(page)}
                  className={`w-5 h-5 text-xs rounded-full ${
                    currentPage === page
                      ? "bg-[#7991a6] text-white animate-pulse"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  } transition`}
                >
                  {page}
                </button>
              )
            );
          })()}
          <button
            onClick={() => {
              setCurrentPage((prev) => Math.min(prev + 1, totalPages));
            }}
            disabled={currentPage === totalPages}
            className={`px-1 py-1 text-sm rounded-md ${
              currentPage === totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#013237] text-white hover:bg-gray-800"
            } transition`}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </main>
  );
}

export default SearchPage;

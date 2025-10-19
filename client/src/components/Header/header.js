import { Search } from "lucide-react";
import { useState, useRef } from "react";

function Header({ setPage, getSearchValue, getSearchResults, setIsLoading }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef(null);

  const handleFocus = () => setIsExpanded(true);

  const handleBlur = () => {
    if (!searchValue) setIsExpanded(false);
  };

  const handleSearchClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    if (searchValue) {
      const searchData = { job_title: searchValue.trim() };
      setIsLoading(true);

      // run the fetch function to actually get the results from the search.
      fetch(`${process.env.REACT_APP_RENDER_URL}/api/v1/jobs/search_jobs`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(searchData),
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
        })
        .then((searchResult) => {
          const jobSearchResult = searchResult.data;
          setIsLoading(false);
          getSearchResults(jobSearchResult);
          setPage("search");
          getSearchValue(searchValue.trim());

          // collapse and clear
          setSearchValue("");
          setIsExpanded(false);
        });
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between border-b border-solid border-b-[#f0f2f4] px-4 md:px-10 py-3 gap-4 w-full">
      <div className="flex items-center gap-4 text-[#111518]">
        <div className="size-4">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[#013237]">
          <a href="/">CareerLink</a>
        </h2>
      </div>
      <div className="relative ml-auto">
        <div
          className={`flex items-center rounded-full border border-gray-300 bg-white transition-all duration-200 ease-out shadow-sm
          ${
            isExpanded
              ? "w-auto md:w-48 lg:w-56 pl-1 pr-1 py-1 px-0 h-9"
              : "h-9 w-9 p-0"
          }
        `}
        >
          <button
            type="button"
            onClick={handleSearchClick}
            className={`flex items-center justify-center rounded-full text-white bg-[#013237] p-1.5 transition duration-200 hover:bg-gray-700 ${
              isExpanded ? "mr-0" : "w-full h-full p-2.5"
            }`}
          >
            <Search size={14} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchClick();
              }
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Search professions, tools... "
            className={`bg-transparent rounded-full text-sm placeholder-gray-400 w-full transition-all duration-300 p-1.5 ${
              isExpanded
                ? "opacity-100 focus:outline-none focus:ring-0 focus:border-transparent"
                : "opacity-0 w-0"
            }`}
            style={{
              outline: "none",
              border: "none",
              boxShadow: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          />
        </div>
      </div>
    </header>
  );
}

export default Header;

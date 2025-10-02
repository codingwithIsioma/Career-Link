import Header from "../Header/header";
import ContentCard from "./main-card";
import Upload from "../Content/upload";
import SearchPage from "../Search/search";
import { useState } from "react";

function AppCard() {
  const [cuteMode, setCuteMode] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [page, setPage] = useState("main");
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleCuteToggle = (value) => {
    setCuteMode(value);
  };

  // get the title being search for...
  const getSearchValue = (value) => {
    setSearchValue(value);
  };

  // get the results of the search
  const getSearchResults = (value) => {
    setSearchResults(value);
  };

  return (
    <div
      className={`relative flex min-h-screen flex-col bg-[#f9fafb] overflow-x-hidden font-[Fredoka]`}
    >
      <div className="layout-container flex h-full flex-col">
        <Header
          retrieveCuteValue={handleCuteToggle}
          setPage={setPage}
          getSearchValue={getSearchValue}
          getSearchResults={getSearchResults}
          setIsLoading={setIsLoading}
        />
        {page === "main" && (
          <ContentCard>
            <Upload
              cuteMode={cuteMode}
              feedback={feedback}
              setFeedback={setFeedback}
            />
          </ContentCard>
        )}

        {page === "search" && (
          <SearchPage
            setPage={setPage}
            searchValue={searchValue}
            searchResults={searchResults}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default AppCard;

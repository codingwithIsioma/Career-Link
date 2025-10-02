function ContentCard(props) {
  return (
    <main className="px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-5">
      <div className="layout-content-container flex flex-col w-full max-w-[960px]">
        {props.children}
      </div>
    </main>
  );
}
export default ContentCard;

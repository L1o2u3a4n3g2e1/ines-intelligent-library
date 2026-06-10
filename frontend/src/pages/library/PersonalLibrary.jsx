import PageHeader from '../../components/PageHeader.jsx';
import PersonalLibraryPanel from '../../components/PersonalLibraryPanel.jsx';

export default function PersonalLibrary() {
  return (
    <>
      <PageHeader title="My private library" description="Upload English books for personal reading or gTTS narration. Only you can access or delete these files." />
      <PersonalLibraryPanel />
    </>
  );
}

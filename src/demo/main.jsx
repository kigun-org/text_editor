import TextEditor from '../text-editor.jsx';

new TextEditor({
  target: document.querySelector('[data-blocknote]'),
  props: {
    editable: true,
    initialBlocks: [{ type: 'paragraph', content: 'Demo note' }],
  },
});

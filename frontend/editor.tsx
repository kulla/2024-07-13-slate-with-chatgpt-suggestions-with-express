import React, { useMemo, useState, useCallback } from 'react'
import {
  createEditor,
  Editor,
  Transforms,
  Text,
  BaseEditor,
  Range,
  Node,
  Descendant,
} from 'slate'
import {
  Slate,
  Editable,
  withReact,
  ReactEditor,
  RenderLeafProps,
} from 'slate-react'
import { withHistory, HistoryEditor } from 'slate-history'
import { v4 as uuidv4 } from 'uuid'

interface CustomText {
  text: string
  bold?: boolean
  italic?: boolean
  suggestion?: boolean
}

type CustomElement = { type: 'paragraph'; children: CustomText[] }

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
}

const initialValue: CustomElement[] = [
  {
    type: 'paragraph',
    children: [{ text: 'A line of text in a paragraph.' }],
  },
]

const SlateEditor = () => {
  const lastChange = React.useRef<number>(Date.now())
  const { editor, editorKey } = useMemo(
    () => ({
      editor: withHistory(withReact(createEditor())),
      editorKey: uuidv4(),
    }),
    [],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const { selection } = editor

      if (selection == null || !Range.isCollapsed(selection)) return

      const [nextNode] = Editor.next(editor) ?? [null]

      if (nextNode != null && isText(nextNode) && nextNode.suggestion) {
        if (event.key === 'Tab') {
          Transforms.select(
            editor,
            Editor.range(editor, ReactEditor.findPath(editor, nextNode)),
          )
          Editor.addMark(editor, 'suggestion', false)
          Transforms.collapse(editor, { edge: 'end' })

          event.preventDefault()
        } else {
          if (event.key.length === 1) {
            if (Node.string(nextNode).startsWith(event.key)) {
              Editor.deleteForward(editor)
              Editor.addMark(editor, 'suggestion', false)
              Editor.insertText(editor, event.key)
              event.preventDefault()
            } else {
              Transforms.select(
                editor,
                Editor.range(editor, ReactEditor.findPath(editor, nextNode)),
              )
              Editor.deleteFragment(editor)
            }
          } else {
            Transforms.select(
              editor,
              Editor.range(editor, ReactEditor.findPath(editor, nextNode)),
            )
            Editor.deleteFragment(editor)
          }
        }
      } else {
        if (event.key === 'F1') {
          editor.insertNodes({ text: 'suggestion', suggestion: true })
          editor.setSelection(selection)
        }
      }
    },
    [editor],
  )

  const fetchSuggestions = React.useCallback(async () => {
    const { selection } = editor

    if (selection == null || !Range.isCollapsed(selection)) return

    const [nextNode] = Editor.next(editor) ?? [null]

    if (nextNode != null && isText(nextNode) && nextNode.suggestion) {
      return
    }

    // FIXME: This function is not working as expected
    let textUntilSelection = ''

    for (const [node] of Node.texts(editor, {
      from: [],
      to: selection.focus.path,
    })) {
      if (isText(node)) {
        textUntilSelection += node.text
      }
    }

    const response = await fetch(
      `/api/complete?context=${encodeURIComponent(textUntilSelection)}`,
    )

    if (response.ok) {
      const { suggestion } = (await response.json()) as { suggestion: string }

      Transforms.insertNodes(editor, {
        text: suggestion,
        suggestion: true,
      })
      editor.setSelection(selection)
    }
  }, [editor])

  const onChange = React.useCallback(() => {
    const lastChangeOfThisCall = Date.now()
    lastChange.current = lastChangeOfThisCall

    // TODO: Check that selection is on end of line

    setTimeout(() => {
      if (lastChange.current === lastChangeOfThisCall) {
        void fetchSuggestions()
      }
    }, 1000)
  }, [fetchSuggestions])

  return (
    <>
      <p>Press F1 to insert a suggestion</p>
      <div>
        <button onClick={() => toggleMark(editor, 'bold')}>Bold</button>
        <button onClick={() => toggleMark(editor, 'italic')}>Italic</button>
      </div>
      <Slate
        editor={editor}
        key={editorKey}
        initialValue={initialValue}
        onChange={onChange}
      >
        <Editable
          renderLeaf={(props) => <Leaf {...props} />}
          onKeyDown={onKeyDown}
        />
      </Slate>
    </>
  )
}

function toggleMark(editor: Editor, format: 'bold' | 'italic') {
  const isActive = isMarkActive(editor, format)
  Transforms.setNodes(
    editor,
    { [format]: isActive ? null : true },
    { match: Text.isText, split: true },
  )
}

function isText(node: object): node is Text {
  return 'text' in node
}

function isMarkActive(editor: Editor, format: 'bold' | 'italic') {
  const marks = Editor.marks(editor) || {}
  return marks[format] === true
}

function Leaf(props: RenderLeafProps) {
  let { children } = props
  const { leaf, attributes } = props
  if (leaf.suggestion) {
    children = <span style={{ color: 'grey' }}>{children}</span>
  }
  if (leaf.bold) {
    children = <strong>{children}</strong>
  }
  if (leaf.italic) {
    children = <em>{children}</em>
  }
  return <span {...attributes}>{children}</span>
}

export default SlateEditor

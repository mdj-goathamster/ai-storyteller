import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { useEffect, useRef, useState } from 'react';
import { Source_Sans_Pro } from 'next/font/google'
import { clearInterval, setInterval } from 'timers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPrint } from '@fortawesome/free-solid-svg-icons'

const FontSSP = Source_Sans_Pro({ weight: '400', subsets: ['latin'] })
export default function Home() {
  const [initialized, setInitialized] = useState(false)
  const { genre, genres, selectGenre, resetGenre } = useGenre({ enabled: initialized })
  const { suggestions, selection, select, reset: resetStoreOptions, setPrompt } = useStoryOptions({ enabled: initialized })
  const [paragraphs, setParagraphs] = useState<string[]>([])
  const [partialText, setPartialText] = useState<string>('')
  const selectionRef = useRef<string>('')
  const chatRef = useRef<HTMLDivElement>(null)
  const [showOptions, setShowOptions] = useState<boolean>(false)
  const [partialTextQueue, setPartialTextQueue] = useState<string[]>([])

  useEffect(() => {
    reset()
  }, [])

  useEffect(() => {
    if (partialTextQueue.length === 0) {
      _partialTextDone()
      return
    }

    const timeout = setTimeout(() => {
      const updatedQueue = [...partialTextQueue]
      const text = updatedQueue.shift()
      setPartialText(pre => [pre, text].join(' '))
      setPartialTextQueue(updatedQueue)
      setShowOptions(false)
    }, 200);

    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight

    return () => clearTimeout(timeout)
  }, [partialTextQueue])

  useEffect(() => {
    if (paragraphs.length === 0) return
    const missingText = paragraphs[paragraphs.length - 1]
    const queue = missingText.substring(selectionRef.current.length, undefined).replace(/\n/g, "<br />").split(' ')
    setPartialTextQueue(prev => [...prev, ...queue])
  }, [paragraphs])

  const _partialTextDone = () => {
    if(partialText.endsWith('The End.')){

    }else{
      setTimeout(() => {
        setShowOptions(true)
      }, 750);
    }
  }

  useEffect(() => {
    if (!genre || !initialized || paragraphs.length > 0) return;
    const abortController = new AbortController()
    promptParagraph([
      ...systemMessage,
      { role: "system", content: `the story should be written in the genre of ${genre}` },
      { role: 'system', content: 'Write one or two sentences and then stop' },
    ], abortController.signal)
      .then((paragraph) => {
        if (abortController.signal.aborted) return
        const updateParagraphs = [...paragraphs, paragraph]
        setParagraphs(updateParagraphs)
        setPrompt([
          ...systemMessage,
          { role: "system", content: `the story should be written in the genre of ${genre}` },
          { role: 'assistant', content: updateParagraphs.join('') },
        ])
      })
    return () => abortController.abort()
  }, [genre, initialized, paragraphs])

  const preWrite = (text: string) => {
    selectionRef.current = text
    const queue = text.replace(/\n/g, "<br />").split(' ')
    setPartialTextQueue(prev => [...prev, "<br /><br />", ...queue])
  }

  const selectOption = async (index: number) => {
    select(index)
    setShowOptions(false)
    const selectedOption = suggestions[index]
    const abortController = new AbortController()
    promptParagraph([
      ...systemMessage,
      { role: "system", content: `The story should be written in the genre of ${genre}` },
      { role: 'system', content: 'Write one or two sentences and then stop' },
      { role: 'assistant', content: paragraphs.slice(-3).join('') },
      { role: 'user', content: `Start the next sentence with: ${selectedOption}` },
      ...(paragraphs.length > 5 ? [{ role: 'system', content: 'If it makes sense, end the story with: "\nThe End."' } as Message] : []),
    ], abortController.signal)
      .then((paragraph) => {
        if (abortController.signal.aborted) return
        const updateParagraphs = [...paragraphs, paragraph]
        setParagraphs(updateParagraphs)
        setPrompt([
          ...systemMessage,
          { role: "system", content: `the story should be written in the genre of ${genre}` },
          { role: 'assistant', content: updateParagraphs.slice(-3).join('') },
        ])
      })
    preWrite(selectedOption)
  }
  const print = () => {
    const printWindow = window.open('', 'PRINT');
    printWindow?.document.write('<html><head><title>' + document.title + '</title>');
    printWindow?.document.write('</head><body >');
    printWindow?.document.write(chatRef?.current?.innerHTML || paragraphs.join('\n'));
    printWindow?.document.write('</body></html>');
    printWindow?.document.close(); // necessary for IE >= 10
    printWindow?.focus(); // necessary for IE >= 10*/
    printWindow?.print();
    printWindow?.close();
    return true;
  }

  const reset = () => {
    setInitialized(false)
    setParagraphs([])
    setPartialText('')
    setPartialTextQueue([])
    setShowOptions(false)
    resetGenre()
    resetStoreOptions()
  }
  const startNewStory = async () => {
    setInitialized(true)
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>DSB Story Teller</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>Story Teller</h1>
        <div className={styles.chatContainer}>
          <div className={styles.chatMessage}>
            {!initialized && (<button className={styles.button} onClick={startNewStory}>Start new story</button>)}
          </div>
          <div className={styles.chatArea} ref={chatRef}>
            {partialText && (<p className={styles.message} style={{ fontFamily: FontSSP.style.fontFamily }} dangerouslySetInnerHTML={{ __html: partialText }} />)}
          </div>
          {initialized && ((!genre && genres.length > 0) || (!selection && suggestions.length > 0 && showOptions)) && <div className={styles.buttonsContainer}>
            {!genre && genres.map((genre, index) => (<button onClick={() => selectGenre(index)} key={index} className={styles.button}>{genre}</button>))}
            {!selection && suggestions.map((suggestion, index) => (<button onClick={() => selectOption(index)} key={index} className={styles.button}>{suggestion}</button>))}
          </div>}
        </div>
        <FontAwesomeIcon size={'2xl'} icon={faPrint} color={'white '} onClick={print} />
      </main>
    </div>
  )
}
const systemMessage: Message[] = [
  {
    role: "system",
    content: "you will assist me in creating a story",
  },
  {
    role: "system",
    content: "the story should take place on a train",
  },
  {
    role: "system",
    content: "the main character of the story is a train conductor",
  }
]

const useGenre = (props: { enabled: boolean }) => {
  const { enabled } = props
  const [genres, setGenres] = useState<string[]>([])
  const [genre, setGenre] = useState<string | undefined>(undefined)

  useEffect(() => {
    const abortController = new AbortController()
    if (!!genre || !enabled) return;
    genreOptions(abortController.signal)
      .then((options) => {
        if (abortController.signal.aborted) return
        setGenres(options)
      })
    return () => abortController.abort()
  }, [enabled, genre])

  const selectGenre = (index: number) => {
    setGenre(genres[index])
  }
  const resetGenre = () => {
    setGenre(undefined)
    setGenres([])
  }

  return { genres, genre, selectGenre, resetGenre }
}

const useStoryOptions = (props: { enabled: boolean }) => {
  const { enabled } = props
  const [prompt, setPrompt] = useState<Message[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selection, setSelection] = useState<string | undefined>(undefined)

  useEffect(() => {
    const abortController = new AbortController()
    if (!!selection || suggestions.length > 0 || !enabled || !prompt || prompt.length === 0) return;
    storyOptions(prompt, abortController.signal)
      .then((options) => {
        if (abortController.signal.aborted) return
        setSuggestions(options.map((option) => option.trim()))
      })
    return () => abortController.abort()
  }, [enabled, prompt, selection])

  const select = (index: number) => {
    setSelection(suggestions[index])
    setSuggestions([])
  }
  const reset = () => {
    setSelection(undefined)
    setSuggestions([])
  }

  return {
    suggestions, selection, select, reset, setPrompt: (prompt: Message[]) => {
      setSuggestions([])
      setSelection(undefined)
      setPrompt(prompt)
    }
  }
}

const genreOptions = async (abortSignal: AbortSignal): Promise<string[]> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
    },
    signal: abortSignal,
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        ...systemMessage,
        {
          role: "user",
          content: "give me 7 options for themes / genres suited for kids.\nformat your answer as a json array of strings: [\"option1\",\"option2\",...]",
        }
      ],
      temperature: .85,
    })
  })
  try {
    const data = await response.json()
    const text = data.choices[0].message.content
    const options: string[] = JSON.parse(text.substring(text.indexOf('['), text.indexOf(']') + 1).toString())
    return options
  } catch (error) {
    throw error
  }
}

const storyOptions = async (messages: Message[], abortSignal: AbortSignal): Promise<string[]> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
    },
    signal: abortSignal,
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        ...messages,
        {
          role: "user",
          content: "give me 3 options for how to start the next sentence.\nformat your answer as a json array of strings: [\"text\",\"text\",...]",
        }
      ],
      temperature: .3,
      presence_penalty: 0.5,
      frequency_penalty: 0.5,
    })
  })
  const data = await response.json()
  const options: string[] = JSON.parse(data.choices[0].message.content.trim())
  return options
}

type Message = {
  role: "user" | "system" | "assistant",
  content: string
}

const promptParagraph = async (messages: Message[], abortSignal: AbortSignal): Promise<string> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
    },
    signal: abortSignal,
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages,
      temperature: .5,
    })
  })
  try {
    const data = await response.json()
    const paragraph: string = data.choices[0].message.content;
    return paragraph
  } catch (e) {
    throw e
  }
}


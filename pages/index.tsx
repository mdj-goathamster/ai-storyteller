import Head from 'next/head'
import styles from '@/styles/Home.module.css'
import { useEffect, useRef, useState } from 'react';
import { Source_Sans_Pro } from 'next/font/google'

const FontSSP = Source_Sans_Pro({ weight: '400', subsets: ['latin'] })
export default function Home() {
  const [initialized, setInitialized] = useState(false)
  const { genre, genres, selectGenre, resetGenre } = useGenre({ enabled: initialized })
  const { suggestions, selection, select, reset: resetStoreOptions, setPrompt } = useStoryOptions({ enabled: initialized })
  const [paragraphs, setParagraphs] = useState<string[]>([])
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    reset()
  }, [])

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [paragraphs])

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

  const selectOption = async (index: number) => {
    select(index)
    const selectedOption = suggestions[index]
    const abortController = new AbortController()
    promptParagraph([
      ...systemMessage,
      { role: "system", content: `the story should be written in the genre of ${genre}` },
      { role: 'system', content: 'Write one or two sentences and then stop' },
      { role: 'assistant', content: paragraphs.join('') },
      { role: 'user', content: `the next sentence should includes: ${selectedOption}` }
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
  }

  const reset = () => {
    setInitialized(false)
    setParagraphs([])
    resetGenre()
    resetStoreOptions()
  }
  const startNewStory = async () => {
    setInitialized(true)
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Modern Chat UI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>Story Teller</h1>
        <div className={styles.chatContainer}>
          <div className={styles.chatMessage}>
            {!initialized && (<button className={styles.button} onClick={startNewStory}>Start new story</button>)}
          </div>
          <div className={styles.chatArea} ref={chatRef}>
            {paragraphs.map((paragraph, index) => (<p key={index} className={styles.message} style={{ fontFamily: FontSSP.style.fontFamily }}>{paragraph}</p>))}
          </div>
          {initialized && ((!genre && genres.length > 0) || (!selection && suggestions.length > 0)) && <div className={styles.buttonsContainer}>
            {!genre && genres.map((genre, index) => (<button onClick={() => selectGenre(index)} key={index} className={styles.button}>{genre}</button>))}
            {!selection && suggestions.map((suggestion, index) => (<button onClick={() => selectOption(index)} key={index} className={styles.button}>{suggestion}</button>))}
          </div>}
        </div>
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
        setSuggestions(options)
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
          content: "give me 5 options for interesting and inovative genres.\nformat your answer as a json array of strings: [\"option1\",\"option2\",...]",
        }
      ],
      temperature: 0,
    })
  })
  const data = await response.json()
  const options: string[] = JSON.parse(data.choices[0].message.content.toString())
  return options
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
          content: "give me 3 options for what could happen next in the story.\neach option should be 1 sentence\nformat your answer as a json array of strings: [\"text\",\"text\",...]",
        }
      ],
      temperature: 0,
    })
  })
  const data = await response.json()
  const options: string[] = JSON.parse(data.choices[0].message.content.toString())
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
  const data = await response.json()
  console.log(data)
  const paragraph: string = data.choices[0].message.content;
  return paragraph
}


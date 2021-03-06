import { stringify, parse } from 'himalaya'
import { parseImage } from './helpers'

export const Heading = ({ json }) => {
  const { tagName: size, children: headingChildren } = json.find(el => el.type === 'element' && el.tagName.includes('h'))
  const [text] = headingChildren.map(text => text.content)
  return {
    type: 'Heading',
    content: {
      text,
      size
    }
  }
}

export const Paragraph = ({ innerHTML }) => ({ type: 'Paragraph', content: { html: innerHTML } })

export const Image = async ({ json }, options) => {
  try {
    const image = await parseImage(json, options)
    return {
      type: 'Image',
      content: { image }
    }
  } catch (error) {
    throw new Error(error.message)
  }
}

export const Gallery = async ({ json }, options) => {
  const { children: imagesElements } = json.find(el => el.tagName === 'ul')

  const images = []
  // Now we can loop through that list, replacing images as usual, and pushing to an array
  for await (const imageEl of imagesElements) {
    try {
      const image = await parseImage(imageEl.children, options)
      images.push(image)
    } catch (error) {
      throw new Error(error.message)
    }
  }

  return {
    type: 'Gallery',
    content: { images }
  }
}

export const List = ({ json }) => {
  const { children: listChildren } = json.find(el => el.tagName === 'ul')
  const items = listChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'List',
    content: { items }
  }
}

export const Quote = ({ json }) => {
  const { children: quoteChildren } = json.find(el => el.tagName === 'blockquote')
  const [text, citation] = quoteChildren.map(({ children: [text] }) => text.content)
  return {
    type: 'Quote',
    content: {
      text,
      citation
    }
  }
}

export const Cover = ({ json, innerBlocksJson }) => {
  const { attributes: coverAttributes } = json.find(el => el.tagName === 'div')
  const { value: backgroundAttribute } = coverAttributes.find(({ key }) => key === 'style')
  const backgroundSourceUrl = backgroundAttribute.replace('background-image:url(', '').slice(0, -1).replace('https://', '').replace('http://', '')

  const [paragraphBlock] = innerBlocksJson
  const { children: [text] } = paragraphBlock.json.find(el => el.tagName === 'p')

  return {
    type: 'Cover',
    content: {
      backgroundImage: backgroundSourceUrl,
      text: text.content
    }
  }
}

export const Audio = ({ json }, { https }) => {
  const { children: audioChildren } = json.find(el => el.tagName === 'figure')
  const [sourceUrl, caption] = audioChildren.map(el => {
    if (el.tagName === 'audio') {
      const { value: sourceUrl } = el.attributes.find(({ key }) => key === 'src')
      return https ? sourceUrl.replace('http://', 'https://') : sourceUrl.replace('https://', 'http://')
    }
    if (el.tagName === 'figcaption') {
      const [text] = el.children
      return text.content
    }
  })
  return {
    type: 'Audio',
    content: {
      caption,
      audio: {
        sourceUrl
      }
    }
  }
}

export const File = ({ json }, { https }) => {
  const { children: [file] } = json.find(el => el.tagName === 'div')
  const { attributes: [source], children: [text] } = file
  const sourceUrl = https ? source.value.replace('http://', 'https://') : source.value.replace('https://', 'http://')

  return {
    type: 'File',
    content: {
      sourceUrl,
      text: text.content
    }
  }
}

export const Video = ({ json }, { https }) => {
  const { children: [video] } = json.find(el => el.tagName === 'figure')
  const [source] = video.attributes.filter(({ key }) => key === 'src')
  const sourceUrl = https ? source.value.replace('http://', 'https://') : source.value.replace('https://', 'http://')
  const videoAttributes = video.attributes.filter(({ key }) => key !== 'src').reduce((obj, attr) => ({ ...obj, [ attr.key ]: attr.value || true }), {})

  return {
    type: 'Video',
    content: {
      sourceUrl,
      ...videoAttributes
    }
  }
}

export const Preformatted = ({ json }) => {
  const { children: [text] } = json.find(el => el.tagName === 'pre')

  return {
    type: 'Preformatted',
    content: {
      text: text.content
    }
  }
}

export const Code = ({ json }) => {
  const { children: [code] } = json.find(el => el.tagName === 'pre')
  const [text] = code.children

  return {
    type: 'Code',
    content: {
      code: text.content
    }
  }
}

export const Html = ({ innerHTML }) => {
  return {
    type: 'HTML',
    content: {
      html: innerHTML
    }
  }
}

export const Pullquote = ({ json }) => {
  const { children: [quote] } = json.find(el => el.tagName === 'figure')
  const [text, citation] = quote.children.map(({ children: [text] }) => text.content)

  return {
    type: 'PullQuote',
    content: {
      text,
      citation
    }
  }
}

export const Table = ({ json }) => {
  const { children: [body] } = json.find(el => el.tagName === 'table')
  const rows = body.children.map(({ children: rowChildren }, i) => {
    const index = i + 1
    const columns = rowChildren.map(({ children: [text] }, i) => ({ index: i + 1, text: text.content }))
    return { index, columns }
  })

  return {
    type: 'Table',
    content: {
      rows
    }
  }
}

export const Verse = ({ json }) => {
  const { children: verseChildren } = json.find(el => el.tagName === 'pre')
  const verseHtml = stringify(verseChildren)

  return {
    type: 'Verse',
    content: {
      html: verseHtml
    }
  }
}

export const Button = ({ json }, { baseUrl }) => {
  const { children: [button] } = json.find(el => el.tagName === 'div')
  const [text] = button.children
  const link = button.attributes.find(({ key }) => key === 'href')
  const slug = link.value.replace('https://', '').replace('http://', '').replace(baseUrl, '')

  return {
    type: 'Button',
    content: {
      text: text.content,
      link: link.value,
      slug
    }
  }
}

export const Columns = ({ innerBlocksJson }) => {
  const columns = innerBlocksJson.map(({ innerBlocks }) => {
    const [{ children: [header] }, ...rest] = innerBlocks.map(({ innerHTML }) => parse(innerHTML).find(el => el.type === 'element'))
    const content = rest.map(({ tagName, children: [text] }) => ({ type: tagName, text: text.content }))
    return {
      header: header.content,
      content
    }
  })

  return {
    type: 'Columns',
    content: {
      columns
    }
  }
}

export const MediaText = async ({ json, innerBlocksJson: [{ json: innerBlocksJson }] }, options) => {
  const { children: [figure] } = json.find(el => el.tagName === 'div')
  const image = await parseImage(figure, options)
  const text = innerBlocksJson.filter(el => el.type === 'element').map(({ tagName, children: [text] }) => ({ type: tagName, text: text.content }))

  return {
    type: 'MediaText',
    content: {
      content: text,
      image
    }
  }
}

export const More = () => ({ type: 'More', content: {} })

export const Nextpage = () => ({ type: 'NextPage', content: {} })

export const Separator = () => ({ type: 'Separator', content: {} })

export const Spacer = ({ json }) => {
  const { attributes: spacerAttributes } = json.find(el => el.tagName === 'div')
  const style = spacerAttributes.find(({ key }) => key === 'style')
  const styleAttributes = style.value.split(';').map(attr => {
    const [k, v] = attr.split(':')
    return { [ k ]: v }
  }).reduce((obj, attr) => ({ ...obj, ...attr }), {})

  return {
    type: 'Spacer',
    content: {
      ...styleAttributes
    }
  }
}

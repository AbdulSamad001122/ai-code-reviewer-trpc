import { Pinecone } from '@pinecone-database/pinecone';

let pinecone : Pinecone | null = null

export function getPineconeIndex(){
  if(!pinecone){
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
  }

  const host = process.env.PINECONE_HOST;

  return pinecone.index({
    name: process.env.PINECONE_INDEX_NAME,
    host,
  })
}
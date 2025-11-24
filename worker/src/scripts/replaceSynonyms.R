#Finds x matches in 'synonym', and replaces them with 'name'
replaceSynonyms <- function(x,name,synonym){
  #Many of x are duplicates, so an indexed version would be faster
  y <- sapply(x,function(xx,s){
    if(is.na(xx)|xx=='') return(NA); r <- grep(xx,s,fixed = TRUE); if(length(r)==0) NA else r #Find matches
  },s=synonym)
  warning(paste0('Replaced synonyms:\n',
                 paste0(apply(unique(cbind(x[!is.na(y)],name[y[!is.na(y)]])),1,paste,collapse=' -> '),
                        collapse='\n')))
  x[!is.na(y)] <- name[y[!is.na(y)]] #Replace matches
  x
}

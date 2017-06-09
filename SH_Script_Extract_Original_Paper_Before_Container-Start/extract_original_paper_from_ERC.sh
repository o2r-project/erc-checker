#!/bin/bash

printf "Beginning extraction. \n\n"

erc_ID="$1"
path_to_image="${2%/}/data/image.tar"

if [ ! "$3" ] ; then
	html_name="main.html" ;
else
	html_name="$3" ;
fi

temp_path="temporaryContent/$erc_ID/"
original_paper_specific_dir="original_papers/$erc_id/"

mkdir temporaryContent/
mkdir $temp_path $original_paper_specific_dir

# extract image content to a temporary storage directory including some id
tar xvf $path_to_image -C $temp_path

# switcheroo over to the temp storage
cd $temp_path

# find all layer.tar balls, and for each found, while searching, 
# copy main.html to a Original Papers' Storage Directory on the platform (permanent)
while 
	read -r result ; 
	do  	echo $result ; 
		tar xf $result | cp "erc/$html_name" "../../$original_paper_specific_dir" ;
		printf "\n" ;
	done < <(find . -name layer.tar)

cd ../../
rm -r $temp_path/* -f



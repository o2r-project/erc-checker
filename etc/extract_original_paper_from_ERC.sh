#!/bin/bash

 # (C) Copyright 2017 o2r-project
 #
 # Licensed under the Apache License, Version 2.0 (the "License");
 # you may not use this file except in compliance with the License.
 # You may obtain a copy of the License at
 #
 #     http://www.apache.org/licenses/LICENSE-2.0
 #
 # Unless required by applicable law or agreed to in writing, software
 # distributed under the License is distributed on an "AS IS" BASIS,
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # See the License for the specific language governing permissions and
 # limitations under the License.


printf "Beginning extraction. \n\n"

erc_ID="$1"
path_to_image="${2%/}/data/image.tar"

base_dir="$(pwd)"
echo "$base_dir"

if [ ! "$3" ] ; then
	html_name="main.html" ;
else
	html_name="$3" ;
fi

temp_path="/tmp/imageContentERC/$erc_ID/"
original_paper_specific_dir="original_papers/$erc_id/"

mkdir -p $temp_path $pwd/$original_paper_specific_dir

# extract image content to a temporary storage directory including some id
tar xvf $path_to_image -C $temp_path

# switcheroo over to the temp storage
cd $temp_path

# find all layer.tar balls, and for each found, while searching, 
# copy main.html to a Original Papers' Storage Directory on the platform (permanent)
while 
	read -r result ; 
	do  	echo $result ; 
		tar xf $result | cp "erc/$html_name" $base_dir/$original_paper_specific_dir ;
		printf "\n" ;
	done < <(find . -name layer.tar)

rm -r $temp_path/* -f



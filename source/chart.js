/*
  This file is part of geneajs.
  geneajs is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  geneajs is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with geneajs.  If not, see <http://www.gnu.org/licenses/>.
*/

var Handlebars = require('handlebars');

ChartHelper = {
  height: 60,
  width: 80,
  spacing: 10,
  spacing_v: 20,
  margin: 200,
  render: function(inAncestors, inDepth, inTemplate, constants) {


    if (constants) {
      var k = Object.keys(constants);
      for (var i = 0; i < k.length; ++i) {
        ChartHelper[k[i]] = constants[k[i]];
      }
    }

    var left;
    var returnObject;
    var data = [];
    var lines = [];

    // default template
    if (!inTemplate) {
      inTemplate = "{{name}}";
    }

    returnObject = ChartHelper.renderAncestors(inAncestors, inDepth);
    data = data.concat(returnObject.data);
    lines = lines.concat(returnObject.lines);
    actualDepth = returnObject.actualDepth;

    var pedigree = ChartHelper.renderPedigree(inAncestors.pedigree);
    var ped_data = pedigree.data;
    var ped_lines = pedigree.lines;
    var ped_right_offset = pedigree.right_offset;
    var ped_left_offset = pedigree.left_offset;

    // left value of element #1
    // (half the width of ancestor tree minus half of element width)
    left = returnObject.maxWidth * (ChartHelper.width + ChartHelper.spacing) / 2 -
           (ChartHelper.width + ChartHelper.spacing) / 2;
    // left = Math.pow(2, actualDepth - 1) * (ChartHelper.width + ChartHelper.spacing) -
    //       (ChartHelper.width + ChartHelper.spacing) / 2;

    // add that left value to each element from pedigree
    ped_data.forEach(function(dat, dat_ind, data) {
      dat.left+= left;
      dat.top+= 0;
    });

    ped_lines.forEach(function(line, line_ind, lines) {
      line.left+= left;
      line.top+= 0;
    });

    // line on top of element #1
    if (inAncestors.father || inAncestors.mother ||
        inAncestors.siblings1 ||
        inAncestors.siblings2) {
      lines.push({
        left: left + (ChartHelper.width / 2),
        top: -(ChartHelper.spacing_v - 2),
        data: {
          orientation: "vertical",
          len: (ChartHelper.spacing_v - 2)
        }
      });
    }

    data = data.concat(ped_data);
    lines = lines.concat(ped_lines);

    // space right of possible new elements to element #1
    var right_space = ped_left_offset + ChartHelper.spacing;

    // siblings1 (siblings left of element #1)
    if (inAncestors.siblings1) {

      returnObject = ChartHelper.renderPart(inAncestors.siblings1,
        left, 0, right_space, 'right');

      data = data.concat(returnObject.data);
      lines = lines.concat(returnObject.lines);
      right_space = returnObject.space;
    }

    // father_siblings (siblings of the father of element #1, they are left of father)
    if (inAncestors.father_siblings) {

      // left value of the father of element #1
      // (half the width of ancestor tree of father minus half of element width)
      var father_left = Math.pow(2, actualDepth - 2) * (ChartHelper.width + ChartHelper.spacing) -
                        (ChartHelper.width + ChartHelper.spacing) / 2;

      // space right of possible new elements to father of element #1
      right_space-=(left - father_left);
      // minimum is value of spacing
      if (right_space < ChartHelper.spacing) {
        right_space = ChartHelper.spacing;
      }
      // inTop for renderPart is negative height of elements plus spacing (relative to top of element #1)
      returnObject = ChartHelper.renderPart(inAncestors.father_siblings,
        father_left, -(ChartHelper.height + (ChartHelper.spacing_v * 2)), right_space, 'right');

      data = data.concat(returnObject.data);
      lines = lines.concat(returnObject.lines);
      right_space = returnObject.space;

    }

    // now the other side
    // we start with the same space here
    var left_space = ped_right_offset + ChartHelper.spacing;

    //siblings2 (siblings on the right)
    if (inAncestors.siblings2) {
      returnObject = ChartHelper.renderPart(inAncestors.siblings2,
        left, 0, left_space, 'left');

      data = data.concat(returnObject.data);
      lines = lines.concat(returnObject.lines);
      left_space = returnObject.space;
    }

    // mother_siblings
    if (inAncestors.mother_siblings) {
      // left value of the mother of element #1
      // (half the width of ancestor tree of mother minus half of element width => left value of father
      // plus half of the width of ancestor tree of element #1)
      var mother_left = Math.pow(2, actualDepth - 2) * (ChartHelper.width + ChartHelper.spacing) -
                        (ChartHelper.width + ChartHelper.spacing) / 2 +
                        Math.pow(2, actualDepth - 1) * (ChartHelper.width + ChartHelper.spacing);

      // space left of possible new elements to mother of element #1
      left_space-=(mother_left - left);
      // minimum is again value of spacing
      if (left_space < (ChartHelper.width + ChartHelper.spacing)) {
        left_space = ChartHelper.width + ChartHelper.spacing;
      }
      // inTop for renderPart is the same as for father_siblings
      returnObject = ChartHelper.renderPart(inAncestors.mother_siblings,
        mother_left, -(ChartHelper.height + (ChartHelper.spacing_v * 2)), left_space, 'left');

      data = data.concat(returnObject.data);
      lines = lines.concat(returnObject.lines);
    }

    return ChartHelper.draw(data, lines, inTemplate);
  },
  renderAncestors: function(inAncestors, inDepth) {
    var ancestors = new Array(inDepth);
    ancestors[0] = [inAncestors];
    var actualDepth;
    var depthFound = false;

    // put ancestors in array of arrays
    ancestors.forEach(function(arr, arr_ind, ancestors) {
      var levelAncestors = [];
      var emptyLevel = true;
      arr.forEach(function(ancestor, ancestor_ind, acestors) {
        var emptyElem = true;
        if (ancestor.father) {
          levelAncestors.push(ancestor.father);
          emptyElem = false;
        } else {
          //levelAncestors.push({type: "empty"});
        }
        if (ancestor.mother) {
          levelAncestors.push(ancestor.mother);
          emptyElem = false;
        } else {
          if (emptyElem) {
            levelAncestors.push({ type: "empty" });
          }
        }
        emptyLevel &= emptyElem;
      });
      if (!depthFound && emptyLevel) {
        actualDepth = arr_ind;
        depthFound = true;
      }// else {
      ancestors[ arr_ind + 1 ] = levelAncestors;
      //}
    });

    if (!actualDepth) {
      actualDepth = inDepth;
    }

    // if mother_siblings or father_siblings is set, actualDepth has to be at least 2
    if ((inAncestors.mother_siblings || inAncestors.father_siblings) && actualDepth < 2) {
      actualDepth = 2;
    }


    var data = [];
    var lines = [];

    for (var j = inDepth; j > actualDepth; j--) {
      ancestors.pop();
    }

    // ancestors begins now with topmost level
    ancestors.reverse();

    ancestors.forEach(function(arr, arr_ind) {
      arr.forEach(function(ancestor, ancestor_ind) {
        var childWidth = 0;
        if (ancestor.father) {
          ancestor.father.isMale = true;
          childWidth += ancestor.father.maxWidth;
        }
        if (ancestor.mother) {
          ancestor.mother.isMale = false;
          childWidth += ancestor.mother.maxWidth;
        }
        ancestor.maxWidth = Math.max(1, childWidth);
      })
    });

    var maxWidth = ancestors[ancestors.length - 1][0].maxWidth;
    //console.log(maxWidth);
    // don't use level with element #1 (was only needed for building the array)
    ancestors.pop();

    // for each level...
    ancestors.forEach(function(arr, arr_ind) {
      // i goes from actualDepth to 1
      var i = actualDepth - arr_ind;
      // for each element on this level...
      var leftOffset = 0;
      arr.forEach(function(ancestor, ancestor_ind) {
        if (ancestor.type === 'empty') {
          // width of the ancestor tree
          leftOffset += ancestor.maxWidth;
        } else { // if (ancestor.type !== "empty") {
          // length of horizontal lines
          // (half the width of ancestor tree of current element)
          // var len = Math.pow(2, arr_ind - 1) * (ChartHelper.width + ChartHelper.spacing);
          var len = ancestor.maxWidth * (ChartHelper.width + ChartHelper.spacing) / 2.0;

          // (half the width of ancestor tree of current element
          // minus half of element width
          // plus full width of ancestor tree of current element times the position on the level)
          // left = (ChartHelper.width + ChartHelper.spacing) *
          //        (Math.pow(2, arr_ind - 1) - 0.5 + Math.pow(2, arr_ind) * ancestor_ind);
          var left = (ChartHelper.width + ChartHelper.spacing) *
                     (ancestor.maxWidth / 2.0 - 0.5 + leftOffset);

          // full width of ancestor tree of current element
          leftOffset += ancestor.maxWidth;

          data.push({
            left: left,
            top: -i * (ChartHelper.height + (ChartHelper.spacing_v * 2)),
            data: ancestor.data
          });
          // vertical line on bottom current element
          lines.push({
            left: left + (ChartHelper.width / 2),
            top: -i * (ChartHelper.height + (ChartHelper.spacing_v * 2)) + (ChartHelper.height + 2),
            data: {
              orientation: "vertical",
              len: ChartHelper.spacing_v
            }
          });
          if (ancestor.isMale) {
            // horizontal line for male ancestors (left)
            lines.push({
              left: left + (ChartHelper.width / 2),
              top: -i * (ChartHelper.height + (ChartHelper.spacing_v * 2)) + (ChartHelper.height + ChartHelper.spacing_v + 2),
              data: {
                orientation: "horizontal",
                len: len
              }
            });
          } else {
            // horizontal line for female ancestors (right)
            lines.push({
              left: left + (ChartHelper.width / 2) - len,
              top: -i * (ChartHelper.height + (ChartHelper.spacing_v * 2)) + (ChartHelper.height + ChartHelper.spacing_v + 2),
              data: {
                orientation: "horizontal",
                len: len
              }
            });
          }
          // vertical line on top of current element
          // when not on top level and when there is at least one ancestor for this element
          // or for father and mother of element #1 if there are siblings of them
          if (i !== actualDepth) {
            if (ancestor.father || ancestor.mother ||
                (ancestor_ind === 0 && inAncestors.father_siblings) ||
                (ancestor_ind === 1 && inAncestors.mother_siblings)) {
              lines.push({
                left: left + (ChartHelper.width / 2),
                top: -i * (ChartHelper.height + (ChartHelper.spacing_v * 2)) - (ChartHelper.spacing_v - 2),
                data: {
                  orientation: "vertical", len: (ChartHelper.spacing_v - 2)
                }
              });
            }
          }
        }
      });
    });
    return {data: data, lines: lines, actualDepth: actualDepth, maxWidth: maxWidth };
  },
  // prepares parts of the full tree (siblings and their descendants)
  // and renders them with renderPedigree
  renderPart: function(inElements, inLeft, inTop, inSpace, direction) {
    var return_data = [];
    var return_lines = [];
    // for each element
    inElements.forEach(function(element, element_ind, elements) {
      var ped = ChartHelper.renderPedigree(element);
      var ped_data = ped.data;
      var ped_lines = ped.lines;
      var ped_left_offset = ped.left_offset;
      var ped_right_offset = ped.right_offset;
      // direction specifies where the reference person is relative to the part
      if (direction === 'left') {
        new_left = inLeft + inSpace +
                   ped_left_offset;
      } else if (direction === 'right') {
        new_left = inLeft - inSpace -
                   ped_right_offset;
      }
      ped_data.forEach(function(dat, dat_ind, data) {
        dat.left+= new_left;
        dat.top+= inTop;
      });

      ped_lines.forEach(function(line, line_ind, lines) {
        line.left+= new_left;
        line.top+= inTop;
      });
      inSpace+= (ChartHelper.width + ChartHelper.spacing) * ped.data[0].maxWidth;

      var len = direction === 'left' ? new_left - inLeft : inLeft - new_left;
      var hor_line_left = direction === 'left' ?
                          inLeft + (ChartHelper.width / 2) :
                          new_left + (ChartHelper.width / 2);

      ped_lines.push({
        left: new_left + (ChartHelper.width / 2),
        top: -(ChartHelper.spacing_v - 2) + inTop,
        data: {
          orientation: "vertical",
          len: (ChartHelper.spacing_v - 2)
        }
      });
      // horizontal line on top of element to connect to other elements of the part or the reference person
      ped_lines.push({
        left: hor_line_left,
        top: -(ChartHelper.spacing_v - 2) + inTop,
        data: {
          orientation: "horizontal",
          len: len
        }
      });

      return_data = return_data.concat(ped_data);
      return_lines = return_lines.concat(ped_lines);
    });

    return {data: return_data, lines: return_lines, space: inSpace};
  },
  draw: function(inData, inLines, inTemplate) {
    var returnData = "";

    // normalize top and left values to get rid of negative values
    var d = ChartHelper.normalize(inData, inLines);
    var data = d.data;
    var lines = d.lines;

    // prepare the handlebars template
    handlebarsTemplate = Handlebars.compile(inTemplate);

    // div which has the size of the whole tree with ChartHelper.margin on each side
    returnData+="<div class='chart_canvas' style='width: " + d.width + "px; height: " + d.height + "px;'>";

    // create html for each line
    lines.forEach(function(line, line_ind, lines) {
      var length_css = line.data.orientation === "horizontal" ? "width: " + line.data.len + "px" : "height: " + line.data.len + "px";
      returnData+="<div class='line' style='top:" + line.top + "px; left:" + line.left + "px; " + length_css + "'>&nbsp;</div>";
    });

    // create html for each data element
    data.forEach(function(dat, dat_ind, data) {
      var gender = dat.data.gender ? dat.data.gender : 'unknown';
      var isAlive = dat.data.alive ? '' : ' dead';
      returnData+="<div class='data_node gender_" + gender + isAlive + "' style='top:" + dat.top + "px; " +
                  "left:" + dat.left + "px; height:" + ChartHelper.height + "px; " +
                  "width:" + ChartHelper.width + "px;'>" + handlebarsTemplate(dat.data) + "</div>";
    });

    returnData+="</div>";

    return returnData;
  },
  normalize: function(inData, inLines) {
    // find the lowest negative numbers
    var mostNegativeLeft = Math.min.apply(Math, inData.map(function(dat) {
      return dat.left;
    }));
    var mostNegativeTop = Math.min.apply(Math, inData.map(function(dat) {
      return dat.top;
    }));

    // subtract the margin
    mostNegativeLeft-=ChartHelper.margin;
    mostNegativeTop-=ChartHelper.margin;

    // make all numbers positive with the information collected above
    var returnData = inData.map(function(dat) {
      return {
        left: dat.left - mostNegativeLeft,
        top: dat.top - mostNegativeTop,
        data: dat.data
      };
    });
    var returnLines = inLines.map(function(line) {
      return {
        left: line.left - mostNegativeLeft,
        top: line.top - mostNegativeTop,
        data: line.data
      };
    });

    // find highest numbers
    var mostPositiveLeft = Math.max.apply(Math, returnData.map(function(dat) {
      return dat.left;
    }));
    var mostPositiveTop = Math.max.apply(Math, returnData.map(function(dat) {
      return dat.top;
    }));

    // calculate height and width of the whole tree
    var height = mostPositiveTop + ChartHelper.height + ChartHelper.margin;
    var width = mostPositiveLeft + ChartHelper.width + ChartHelper.margin;

    return {data: returnData, lines: returnLines, height: height, width: width};
  },
  renderPedigree: function(inPedigree) {

    var pedigree = ChartHelper.preparePedigree(inPedigree);

    var data = [];
    var lines = [];
    var left_offset = 0;
    var right_offset = 0;

    ChartHelper.preOrder(pedigree, function(inElement) {
      // center the element
      inElement.left+=((ChartHelper.width + ChartHelper.spacing)*inElement.maxWidth)/2;
      data.push(inElement);
    });

    var spouses_data = [];

    data.forEach(function(dat, dat_ind, data) {
      if (dat.spouses) {
        if (dat.spouses.length === 1) {
          dat.spouses[0].top = dat.top;
          dat.spouses[0].left = dat.left + ((ChartHelper.width + ChartHelper.spacing) / 2);
          dat.left = dat.spouses[0].left - (ChartHelper.width + ChartHelper.spacing);
          spouses_data.push(dat.spouses[0]);
          var width = 0;
          if (dat.spouses[0].children) {
            dat.spouses[0].children.forEach(function(child, child_ind, children) {
              width+=child.maxWidth;
            });
          } else {
            width = 1;
          }
          width = Math.max(2, width);
          dat.spouses[0].width = width;
        } else {
          dat.left-=((ChartHelper.width + ChartHelper.spacing) * dat.maxWidth)/2;
          var width00 = 0;
          dat.spouses.forEach(function(spouse, spouse_ind, spouses) {
            spouse.top = dat.top;
            var width = 0;
            if (spouse.children) {
              spouse.children.forEach(function(child, child_ind, children) {
                width+=child.maxWidth;
              });
            } else {
              width = 1;
              if (spouse_ind === 0) {
                width = 2;
              }
            }
            spouse.width = width;
            spouse.left = dat.left +
                          (ChartHelper.width + ChartHelper.spacing) * ((width / 2) + width00);
            width00+=width;

            spouses_data.push(spouse);
          });

          dat.spouses[0].left+= ((ChartHelper.width + ChartHelper.spacing) / 2);
          dat.left = dat.spouses[0].left - (ChartHelper.width + ChartHelper.spacing);
          dat.width00 = width00;
        }
      }
    });
    if (inPedigree.spouses) {
      if (inPedigree.spouses.length === 1) {
        left_offset = (data[0].spouses[0].width * (ChartHelper.width + ChartHelper.spacing) / 2 - (ChartHelper.spacing / 2)) -
                      (ChartHelper.width + (ChartHelper.spacing / 2));
        right_offset = (data[0].spouses[0].width * (ChartHelper.width + ChartHelper.spacing) / 2 - (ChartHelper.spacing / 2)) +
                       (ChartHelper.width + (ChartHelper.spacing / 2));
      } else {
        left_offset = (data[0].spouses[0].width * (ChartHelper.width + ChartHelper.spacing) / 2 - (ChartHelper.spacing / 2)) -
                      (ChartHelper.width + (ChartHelper.spacing / 2));
        right_offset = data[0].width00 * (ChartHelper.width + ChartHelper.spacing) - ChartHelper.spacing - left_offset;
      }
    } else {
      right_offset = ChartHelper.width;
      left_offset = 0;
    }
    data = data.concat(spouses_data);

    var left1;
    var top;
    var len;

    ChartHelper.preOrder(pedigree, function(inElement) {
      // and add lines

      if (inElement.spouses) {
        inElement.spouses.forEach(function(spouse, spouse_ind, spouses) {
          lines.push({
            left: inElement.left + (ChartHelper.width / 2),
            top: inElement.top + ChartHelper.height + 2,
            data: {
              orientation: "vertical",
              len: ChartHelper.spacing_v
            }
          });

          lines.push({
            left: spouse.left + (ChartHelper.width / 2),
            top: spouse.top + ChartHelper.height + 2,
            data: {
              orientation: "vertical",
              len: ChartHelper.spacing_v
            }
          });
          if (spouse.children) {
            spouse.children.forEach(function(child, child_ind, children) {
              lines.push({
                left: child.left + (ChartHelper.width / 2),
                top: child.top - (ChartHelper.spacing_v - 2),
                data: {
                  orientation: "vertical",
                  len: (ChartHelper.spacing_v - 2)
                }
              });
              if (child_ind === 0) {
                left1 = child.left + (ChartHelper.width / 2);
                top = child.top - (ChartHelper.spacing_v - 2);
              }
              if (child_ind === children.length - 1) {
                if (child.left < spouse.left) {
                  // see test case "testTwoChildrenOneWithSpouse"
                  len = (spouse.left + (ChartHelper.width / 2)) - left1;
                } else {
                  len = (child.left + (ChartHelper.width / 2)) - left1;
                }
              }
            });
            lines.push({
              left: left1,
              top: top,
              data: {
                orientation: "horizontal",
                len: len
              }
            });

            if (spouse.children.length === 1 && spouse_ind === 0) {
              var left_compensate = 0;
              // because we gave single children a width of 2 to center them relative to their parents..
              if (!spouse.children[0].spouses) {
                left_compensate = ((ChartHelper.width + ChartHelper.spacing) / 2);
              }

              lines.push({
                left: left1 - left_compensate,
                top: top,
                data: {
                  orientation: "horizontal",
                  len: ChartHelper.width + ChartHelper.spacing
                }
              });
            }
			 } else {
            lines.push({
              left: inElement.left + (ChartHelper.width / 2),
              top: inElement.top + ChartHelper.height + 2 + ChartHelper.spacing_v,
              data: {
                orientation: "horizontal",
                len: ChartHelper.width + ChartHelper.spacing
              }
            });
          }
          // draw additional lines, if there is more than one spouse
          if (spouse_ind > 0) {
            lines.push({
              left: inElement.left + ChartHelper.width,
              top: inElement.top + (ChartHelper.height / 2),
              data: {
                orientation: "horizontal",
                len: spouse.left - (inElement.left + ChartHelper.width)
              }
            });
          }
        });
      }
    });

    var root_left = pedigree.left;
    var root_top = pedigree.top;

    data.forEach(function(dat, dat_ind, data){
      dat.left-= root_left;
      dat.top-= root_top;
    });
    lines.forEach(function(line, line_ind, lines){
      line.left-= root_left;
      line.top-= root_top;
    });

    return {
      data: data,
      lines: lines,
      left_offset: left_offset,
      right_offset: right_offset
    };
  },
  preparePedigree: function(inPedigree) {
    var maxWidth = 0;
    var returnSpouses = [];

    var moveElement = function (inElement) {
      inElement.left+= (ChartHelper.width + ChartHelper.spacing) * maxWidth;
      inElement.top+= ChartHelper.height + (ChartHelper.spacing_v * 2);
    };

    if (!inPedigree.spouses) {
      return {left: 0, top: 0, maxWidth: 1, data: inPedigree.data};
    } else {
      inPedigree.spouses.forEach(function(spouse, spouse_ind, spouses) {
        if (!spouse.children || spouse.children.length === 0) {
          maxWidth+= 1;
          if (spouse_ind === 0) {
            maxWidth+= 1;
          }
          returnSpouses[returnSpouses.length] = {
            data: spouse.data
          };
        } else {
          var returnChildren = [];
          spouse.children.forEach(function(child, child_ind, children) {
            returnChildren.push(ChartHelper.preparePedigree(child));

            var currentChild = returnChildren[returnChildren.length - 1];
            ChartHelper.preOrder(currentChild, moveElement);

            maxWidth+= currentChild.maxWidth;
            if (spouse_ind === 0 &&
                spouse.children.length === 1 &&
                currentChild.maxWidth === 1) {
              maxWidth+= 1;
              // set maxWidth of only child to 2 instead of 1 to center the element
              currentChild.maxWidth = 2;
            }
          });

          returnSpouses.push({
            data: spouse.data,
            children: returnChildren
          });
        }
      });
      return {
        left: 0,
        top: 0,
        maxWidth: maxWidth,
        data: inPedigree.data,
        spouses: returnSpouses
      };
    }
  },
  preOrder: function(inTree, inCallback) {
    inCallback(inTree);
    if (inTree.spouses) {
      inTree.spouses.forEach(function(spouse, spouse_ind, spouses) {
        if (spouse.children) {
          spouse.children.forEach(function(child, child_ind, children) {
            ChartHelper.preOrder(child, inCallback);
          });
        }
      });
    }
  }
};


if (typeof exports !== 'undefined') {
  exports.ChartHelper = ChartHelper;
}
